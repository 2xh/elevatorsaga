
var requireUserCountWithinTime = function(userCount, timeLimit) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people in <span class='emphasis-color'>" + timeLimit.toFixed(0) + "</span> seconds or less",
        evaluate: function(world) {
            if(world.elapsedTime >= timeLimit || world.transportedCounter >= userCount) {
                return world.elapsedTime <= timeLimit && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    };
};

var requireUserCountWithMaxWaitTime = function(userCount, maxWaitTime) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people and let no one wait more than <span class='emphasis-color'>" + maxWaitTime.toFixed(1) + "</span> seconds",
        evaluate: function(world) {
            if(world.maxWaitTime >= maxWaitTime || world.transportedCounter >= userCount) {
                return world.maxWaitTime <= maxWaitTime && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    };
};

var requireUserCountWithinTimeWithMaxWaitTime = function(userCount, timeLimit, maxWaitTime) {
    return {
       description: "Transport <span class='emphasis-color'>" + userCount + "</span> people in <span class='emphasis-color'>" + timeLimit.toFixed(0) + "</span> seconds or less and let no one wait more than <span class='emphasis-color'>" + maxWaitTime.toFixed(1) + "</span> seconds",
       evaluate: function(world) {
            if(world.elapsedTime >= timeLimit || world.maxWaitTime >= maxWaitTime || world.transportedCounter >= userCount) {
                return world.elapsedTime <= timeLimit && world.maxWaitTime <= maxWaitTime && world.transportedCounter >= userCount;
            } else {
                return null;
            }
       }
    };
};

var requireUserCountWithinMoves = function(userCount, moveLimit) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people using <span class='emphasis-color'>" + moveLimit + "</span> elevator moves or less",
        evaluate: function(world) {
            if(world.moveCount >= moveLimit || world.transportedCounter >= userCount) {
                return world.moveCount <= moveLimit && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    };
};

var requireUserCountWithAvgWaitTime = function(userCount, avgWaitTime) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people and let most people wait less than <span class='emphasis-color'>" + avgWaitTime.toFixed(1) + "</span> seconds",
        evaluate: function(world) {
            if(world.transportedCounter >= userCount) {
                return world.avgWaitTime <= avgWaitTime;
            } else {
                return null;
            }
        }
    };
}

var requireDemo = function() {
    return {
        description: "Perpetual demo",
        evaluate: function() { return null; }
    };
};

var requireSandbox = function() {
    return {
        description: "Sandbox",
        evaluate: function() { return null; }
    };
};

/* jshint laxcomma:true */
var challenges = [
    {options: {floorCount: 3, elevatorCount: 1, spawnRate: 11.0, elevatorCapacities: [100]}, condition: requireUserCountWithinTime(540, 60)}
    ,{options: {floorCount: 7, elevatorCount: 1, spawnRate: 0.5, elevatorCapacities: [7], lobbyPossibility: 0.2}, condition: requireUserCountWithinTime(23, 60)}
    ,{options: {floorCount: 5, elevatorCount: 1, spawnRate: 0.2, startFloors: [4]}, condition: requireUserCountWithMaxWaitTime(20, 15)}
    ,{options: {floorCount: 13, elevatorCount: 2, spawnRate: 1.1, elevatorCapacities: [6, 10], startFloors: [0, 12]}, condition: requireUserCountWithinTime(50, 75)}
    ,{options: {floorCount: 12, elevatorCount: 4, spawnRate: 1.7, elevatorSpeeds: [8], startFloors: [0, 11]}, condition: requireUserCountWithinTime(100, 68)}
    ,{options: {floorCount: 4, elevatorCount: 2, spawnRate: 0.8}, condition: requireUserCountWithinMoves(75, 35)}
    ,{options: {floorCount: 10, elevatorCount: 4, spawnRate: 2.0, elevatorCapacities: [8, 12], startFloors: [0, 5]}, condition: requireUserCountWithinMoves(200, 100)}
    ,{options: {floorCount: 6, elevatorCount: 2, spawnRate: 0.4, elevatorSpeeds: [5], startFloors: [5], lobbyPossibility: 0.8}, condition: requireUserCountWithMaxWaitTime(50, 18)}
    ,{options: {floorCount: 12, elevatorCount: 3, spawnRate: 0.8, elevatorSpeeds: [6], lobbyPossibility: 0.2}, condition: requireUserCountWithMaxWaitTime(50, 20)}
    ,{options: {floorCount: 8, elevatorCount: 3, spawnRate: 3.5, elevatorCapacities: [5, 15, 25], elevatorSpeeds: [6, 4, 2]}, condition: requireUserCountWithinTime(180, 70)}
    ,{options: {floorCount: 9, elevatorCount: 4, spawnRate: 1.0, elevatorCapacities: [8]}, condition: requireUserCountWithMaxWaitTime(80, 19)}
    ,{options: {floorCount: 13, elevatorCount: 5, spawnRate: 1.2, elevatorCapacities: [8], elevatorSpeeds: [6], startFloors: [0, 3, 6, 9, 12], lobbyPossibility: 0.8}, condition: requireUserCountWithMaxWaitTime(110, 17)}
    ,{options: {floorCount: 15, elevatorCount: 6, spawnRate: 1.0, elevatorSpeeds: [7], lobbyPossibility: 0.2}, condition: requireUserCountWithMaxWaitTime(120, 14)}
    ,{options: {floorCount: 21, elevatorCount: 4, spawnRate: 1.8, elevatorCapacities: [8], elevatorSpeeds: [4, 8], startFloors: [0, 20], lobbyPossibility: 0.8}, condition: requireUserCountWithinTime(250, 180)}
    ,{options: {floorCount: 21, elevatorCount: 5, spawnRate: 2.0, elevatorCapacities: [10], elevatorSpeeds: [4, 8], startFloors: [20, 0], lobbyPossibility: 0.2}, condition: requireUserCountWithinTimeWithMaxWaitTime(200, 120, 45)}
    ,{options: {floorCount: 41, elevatorCount: 8, spawnRate: 3.5, elevatorCapacities: [8, 12], elevatorSpeeds: [8, 6]}, condition: requireUserCountWithinTime(900, 300)}
    ,{options: {floorCount: 25, elevatorCount: 8, spawnRate: 1.6, elevatorCapacities: [6, 8]}, condition: requireUserCountWithinTimeWithMaxWaitTime(1900, 1200, 40)}
    ,{options: {floorCount: 31, elevatorCount: 10, spawnRate: 3.5, elevatorCapacities: [6, 8], elevatorSpeeds: [6, 5]}, condition: requireUserCountWithAvgWaitTime(3500, 20)}
    ,{options: {floorCount: 200, elevatorCount: 60, spawnRate: 18.0, elevatorCapacities: [16, 20], elevatorSpeeds: [11, 9], startFloors: [0, 40, 80, 120, 160]}, condition: requireDemo()}
    ,{options: {floorCount: 10, elevatorCount: 3, spawnRate: 0.0, elevatorCapacities: [10]}, condition: requireSandbox()}
];
/* jshint laxcomma:false */
