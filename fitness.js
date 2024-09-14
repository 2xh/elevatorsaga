"use strict";

var requireNothing = function() {
    return {
        description: "No requirement",
        evaluate: function() { return null; }
    };
};

var fitnessChallenges = [
     {options: {description: "Small scenario", floorCount: 4, elevatorCount: 2, spawnRate: 0.6}, condition: requireNothing()}
    ,{options: {description: "Medium scenario", floorCount: 6, elevatorCount: 3, spawnRate: 1.5, elevatorCapacities: [5]}, condition: requireNothing()}
    ,{options: {description: "Large scenario", floorCount: 18, elevatorCount: 6, spawnRate: 1.9, elevatorCapacities: [8]}, condition: requireNothing()}
]

// Simulation without visualisation
function calculateFitness(challenge, codeObj, stepSize, stepsToSimulate) {
    var controller = createWorldController(stepSize);
    var result = {};

    var worldCreator = createWorldCreator();
    var world = worldCreator.createWorld(challenge.options);
    var frameRequester = createFrameRequester(stepSize);

    controller.on("usercode_error", function(e) {
        result.error = e;
    });
    world.on("stats_changed", function() {
        result.moveCount = world.moveCount;
        result.elapsedTime = world.elapsedTime;
        result.maxWaitTime = world.maxWaitTime;
        result.transportedPerSec = world.transportedPerSec;
        result.avgWaitTime = world.avgWaitTime;
        result.transportedCount = world.transportedCounter;
    });

    controller.isPaused = false;
    controller.start(world, codeObj, frameRequester.register);

    for(var stepCount=0; stepCount < stepsToSimulate && !controller.isPaused; stepCount++) {
        frameRequester.trigger();
    }
    world.unWind();
    return result;
};


function makeAverageResult(results) {
    var averagedResult = {};
    _.forOwn(results[0].result, function(value, resultProperty) {
        var sum = _.sum(_.pluck(_.pluck(results, "result"), resultProperty));
        averagedResult[resultProperty] = sum / results.length;

    });
    return { options: results[0].options, result: averagedResult };
};


function doFitnessSuite(codeStr, runCount, time, step) {
    try {
        var codeObj = getCodeObjFromCode(codeStr);
    } catch(e) {
        return {error: e.toString()};
    }
    console.log("Fitness testing code", codeObj);
    time = time || 12000;
    step = step || 1000.0/60.0;
    var error = null;

    var testruns = [];
    _.times(runCount, function() {
        var results = _.map(fitnessChallenges, function(challenge) {
            var fitness = calculateFitness(challenge, codeObj, step, time);
            if(fitness.error) { error = fitness.error; return };
            return { options: challenge.options, result: fitness }
        });
        if(error) { return; }
        testruns.push(results);
    });
    if(error) {
        return { error: error.toString() }
    }

    // Now do averaging over all properties for each challenge's test runs
    var averagedResults = _.map(_.range(testruns[0].length), function(n) { return makeAverageResult(_.pluck(testruns, n)) });
    
    return averagedResults;
};

function fitnessSuite(codeStr, preferWorker, callback) {
    if(self.Worker && preferWorker) {
        // Web workers are available, neat.
        var errHandler = function(e) {
            console.log("Fitness worker encountered an error, falling back to normal", e);
            fitnessSuite(codeStr, false, callback);
        };
        try {
            var w = new Worker("fitnessworker.js");
            w.onerror = errHandler;
            w.onmessage = function(msg) {
                console.log("Got message from fitness worker", msg);
                var results = msg.data;
                callback(results);
            };
            w.postMessage(codeStr);
        } catch(e) {
            errHandler(e);
        }
    } else {
        // Fall back do synch calculation without web worker
        var results = doFitnessSuite(codeStr, 2);
        callback(results);
    }
};