"use strict";

var createWorldCreator = function() {
    var creator = {};

    creator.createFloors = function(floorCount, floorHeights, errorHandler) {
        var floors = [], yPos = 0;
        for(var f = floorCount - 1; f >= 0; f--) {
            floors.unshift(Floor({}, f, yPos, floorHeights[f % floorHeights.length], errorHandler));
            yPos += floors[0].height;
        }
        return floors;
    };

    creator.createElevators = function(elevatorCount, floors, elevatorCapacities, elevatorSpeeds, startFloors, errorHandler) {
        elevatorCapacities = elevatorCapacities || [6];
        elevatorSpeeds = elevatorSpeeds || [3];
        startFloors = startFloors || [0];
        var currentX = 160.0;
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = new Elevator(elevatorSpeeds[i%elevatorSpeeds.length], floors, elevatorCapacities[i%elevatorCapacities.length], errorHandler);

            // Move to right x position
            elevator.moveTo(currentX, null);
            elevator.setFloorPosition(startFloors[i%startFloors.length]);
            elevator.updateDisplayPosition();
            currentX += (10 + elevator.width);
            return elevator;
        });
        return elevators;
    };

    creator.createRandomUser = function() {
        var user;
        if(_.random(20) === 0) {
            user = new User(_.random(35, 60));
            user.displayType = "child";
        } else if(_.random(1) === 0) {
            user = new User(_.random(45, 75));
            user.displayType = "female";
        } else {
            user = new User(_.random(60, 100));
            user.displayType = "male";
        }
        return user;
    };

    creator.spawnUserRandomly = function(floorCount, floors, lobbyPossibility) {
        if(lobbyPossibility == undefined) {
            lobbyPossibility = 0.5;
        }
        var user = creator.createRandomUser();
        user.moveTo(90+_.random(40), 0);
        var currentFloor = Math.random() < lobbyPossibility ? 0 : _.random(1, floorCount - 1);
        var destinationFloor;
        if(currentFloor === 0) {
            // Definitely going up
            destinationFloor = _.random(1, floorCount - 1);
        } else {
            // Usually going down, but sometimes not
            destinationFloor = Math.random() < lobbyPossibility ? 0 : _.random(1, floorCount - 1);
            if(destinationFloor === currentFloor) {
                destinationFloor = 0;
            }
        }
        user.appearOnFloor(floors[currentFloor], destinationFloor);
        return user;
    };

    creator.createWorld = function(options) {
        console.log("Creating world with options", options);
        var defaultOptions = { floorHeights: [35], floorCount: 4, elevatorCount: 2, spawnRate: 0.5 };
        options = _.defaults(_.clone(options), defaultOptions);
        var world = {};
        riot.observable(world);

        var handleUserCodeError = function(e) {
            world.trigger("usercode_error", e);
        }

        world.floors = creator.createFloors(options.floorCount, options.floorHeights, handleUserCodeError);
        world.floors.totalHeight = world.floors.reduce(function(h, floor){ return h + floor.height; }, 0);
        world.elevators = creator.createElevators(options.elevatorCount, world.floors, options.elevatorCapacities, options.elevatorSpeeds, options.startFloors, handleUserCodeError);
        world.users = [];
        world.transportedCounter = 0;
        world.transportedPerSec = 0.0;
        world.moveCount = 0;
        world.elapsedTime = 0.0;
        world.maxWaitTime = 0.0;
        world.avgWaitTime = 0.0;
        world.challengeEnded = false;

        var recalculateStats = function() {
            world.transportedPerSec = world.transportedCounter / world.elapsedTime;
            // TODO: Optimize this loop?
            world.moveCount = _.reduce(world.elevators, function(sum, elevator) { return sum+elevator.moveCount; }, 0);
            world.trigger("stats_changed");
        };

        var registerUser = function(user) {
            world.users.push(user);
            user.spawnTimestamp = world.elapsedTime;
            world.trigger("new_user", user);
            user.on("exited_elevator", function() {
                world.transportedCounter++;
                world.maxWaitTime = Math.max(world.maxWaitTime, world.elapsedTime - user.spawnTimestamp);
                world.avgWaitTime = (world.avgWaitTime * (world.transportedCounter - 1) + (world.elapsedTime - user.spawnTimestamp)) / world.transportedCounter;
            });
            user.updateDisplayPosition();
        };

        var handleElevAvailability = function(elevator) {
            // Use regular loops for memory/performance reasons
            // Notify floors first because overflowing users
            // will press buttons again.
            world.floors[elevator.currentFloor].elevatorAvailable(elevator);
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                var user = users[i];
                if(user.currentFloor === elevator.currentFloor) {
                    user.elevatorAvailable(elevator, world.floors[elevator.currentFloor]);
                }
            }
        };

        // Bind them all together
        for(var i=0; i < world.elevators.length; ++i) {
            world.elevators[i].on("entrance_available", handleElevAvailability);
        }

        var handleButtonRepressing = function(eventName, floor) {
            for(var i=0, len=world.elevators.length; i < len; ++i) {
                var elevator = world.elevators[i];
                if( eventName === "up_button_pressed" && elevator.directionalIndicators[0] ||
                    eventName === "down_button_pressed" && elevator.directionalIndicators[1]) {

                    // Elevator is heading in correct direction, check for suitability
                    if(elevator.currentFloor === floor.level && elevator.isOnAFloor() && !elevator.isMoving && !elevator.isFull()) {
                        // Potentially suitable to get into
                        if(elevator.currentTask) {
                            elevator.currentTask(null);
                        }
                        elevator.moveToFloor(floor.level);
                        return;
                    }
                }
            }
        }

        // This will cause elevators to "re-arrive" at floors if someone presses an
        // appropriate button on the floor before the elevator has left.
        for(var i=0; i<world.floors.length; ++i) {
            world.floors[i].on("up_button_pressed down_button_pressed", handleButtonRepressing);
        };

        var elapsedSinceSpawn = 1.0/options.spawnRate;

        // Main update function
        world.update = function(dt) {
            world.elapsedTime += dt;
            elapsedSinceSpawn += dt;
            while(elapsedSinceSpawn > 1.0/options.spawnRate) {
                elapsedSinceSpawn -= 1.0/options.spawnRate;
                registerUser(creator.spawnUserRandomly(options.floorCount, world.floors, options.lobbyPossibility));
            }

            // Use regular for loops for performance and memory friendlyness
            for(var i=0, len=world.elevators.length; i < len; ++i) {
                var e = world.elevators[i];
                e.update(dt);
                if(e.isMoving) {
                    e.updateElevatorMovement(dt);
                }
            }
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                var u = users[i];
                u.update(dt);
                if(!u.done && world.elapsedTime - u.spawnTimestamp > world.maxWaitTime - 3) {
                    if(!u.longWait && world.elapsedTime >= 5) {
                        u.longWait = true;
                        u.trigger("new_display_state");
                    }
                    if(world.elapsedTime - u.spawnTimestamp >= world.maxWaitTime) {
                        world.maxWaitTime = world.elapsedTime - u.spawnTimestamp;
                        u.trigger("new_display_state");
                    }
                }
            };

            for(var users=world.users, i=world.users.length-1; i>=0; i--) {
                var u = users[i];
                if(u.removeMe) {
                    users.splice(i, 1);
                }
            }
            
            recalculateStats();
        };

        world.updateDisplayPositions = function() {
            for(var i=0, len=world.elevators.length; i < len; ++i) {
                world.elevators[i].updateDisplayPosition();
            }
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                users[i].updateDisplayPosition();
            }
        };


        world.unWind = function() {
            console.log("Unwinding", world);
            _.each(world.elevators.concat(world.users).concat(world.floors).concat(world), function(obj) {
                obj.off("*");
            });
            world.challengeEnded = true;
            world.elevators = world.users = world.floors = [];
        };

        world.init = function() {
            // Checking the floor queue of the elevators triggers the idle event here
            for(var i=0; i < world.elevators.length; ++i) {
                world.elevators[i].checkDestinationQueue();
            }
        };

        return world;
    };

    return creator;
};


var createWorldController = function(dtMax) {
    var controller = riot.observable({});
    controller.timeScale = 1.0;
    controller.isPaused = true;
    controller.start = function(world, codeObj, animationFrameRequester) {
        var lastT = null;
        var firstUpdate = true;
        world.on("usercode_error", controller.handleUserCodeError);
        controller.update = function() {
            return animationFrameRequester(updater);
        }
        var updater = function(t) {
            if(!controller.isPaused && !world.challengeEnded) {
                if(firstUpdate) {
                    // This logic prevents infite loops in usercode from breaking the page permanently - don't evaluate user code until game is unpaused.
                    try {
                        codeObj.init(world.elevators, world.floors);
                        firstUpdate = false;
                        world.init();
                    } catch(e) { controller.handleUserCodeError(e); }
                } else if(lastT !== null) {
                    var dt = (t - lastT);
                    var scaledDt = dt * 0.001 * controller.timeScale;
                    scaledDt = Math.min(scaledDt, dtMax * 3600 * controller.timeScale); // Limit to prevent unhealthy substepping
                    try {
                        codeObj.update(scaledDt, world.elevators, world.floors);
                    } catch(e) { controller.handleUserCodeError(e); }
                    while(scaledDt > 0.0 && !world.challengeEnded) {
                        var thisDt = Math.min(dtMax, scaledDt);
                        world.update(thisDt);
                        scaledDt -= thisDt;
                    }
                    world.updateDisplayPositions();
                    world.trigger("stats_display_changed"); // TODO: Trigger less often for performance reasons etc
                }
                lastT = t;
                controller.update();
            } else {
                lastT = null;
            }
        };
        if(!controller.isPaused) {
            controller.update();
        }
    };

    controller.handleUserCodeError = function(e) {
        controller.setPaused(true);
        console.log("Usercode error on update", e);
        controller.trigger("usercode_error", e);
    };

    controller.setPaused = function(paused) {
        controller.isPaused = paused;
        if(!paused) {
            controller.update();
        }
        controller.trigger("timescale_changed");
    };
    controller.setTimeScale = function(timeScale) {
        controller.timeScale = timeScale;
        controller.trigger("timescale_changed");
    };

    return controller;
};
