"use strict";

function Floor(obj, floorLevel, yPosition, floorHeight, errorHandler) {
    var floor = riot.observable(obj);

    floor.level = floorLevel;
    floor.yPosition = yPosition;
    floor.height = floorHeight;
    floor.buttonStates = [false, false];

    // TODO: Ideally the floor should have a facade where tryTrigger is done
    var tryTrigger = function(event, arg1, arg2, arg3, arg4) {
        try {
            floor.trigger(event, arg1, arg2, arg3, arg4);
        } catch(e) { errorHandler(e); }
    };

    floor.pressButton = function(button) {
        if(button > 0) {
            button = 0;
        } else if(button < 0) {
            button = 1;
        } else {
            return;
        }
        if(!floor.buttonStates[button]) {
            floor.buttonStates[button] = true;
            tryTrigger("buttonstate_change", floor.buttonStates);
            tryTrigger(button === 0 ? "up_button_pressed" : "down_button_pressed", floor);
        }
    };

    floor.elevatorAvailable = function(elevator) {
        if(elevator.directionalIndicators[0] && floor.buttonStates[0]) {
            floor.buttonStates[0] = false;
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
        if(elevator.directionalIndicators[1] && floor.buttonStates[1]) {
            floor.buttonStates[1] = false;
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
    };

    floor.getSpawnPosY = function() {
        return floor.yPosition + floor.height - 22;
    };

    return floor;
};
