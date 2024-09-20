"use strict";

function Floor(obj, floorLevel, yPosition, floorCount, floorHeight, errorHandler) {
    var floor = riot.observable(obj);

    floor.level = floorLevel;
    floor.yPosition = yPosition;
    floor.height = floorHeight;
    floor.buttonStates = _.fill(_.range(floorCount), false);

    // TODO: Ideally the floor should have a facade where tryTrigger is done
    var tryTrigger = function(event, arg1, arg2, arg3, arg4) {
        try {
            floor.trigger(event, arg1, arg2, arg3, arg4);
        } catch(e) { errorHandler(e); }
    };

    floor.pressButton = function(button) {
        button = Math.clamp(button, 0, floorCount - 1);
        if(!floor.buttonStates[button]) {
            floor.buttonStates[button] = true;
            tryTrigger("buttonstate_change", floor.buttonStates, button);
            tryTrigger("call_button_pressed", button);
        }
    };

    floor.elevatorAvailable = function(elevator) {
        for(var i = 0; i < floor.buttonStates.length; i++) {
            if(floor.buttonStates[i] && elevator.isSuitableForTravelBetween(floor.level, i)) {
                floor.buttonStates[i] = false;
                tryTrigger("buttonstate_change", floor.buttonStates, i);
            }
        }
    };

    floor.getSpawnPosY = function() {
        return floor.yPosition + floor.height - 22;
    };

    return floor;
};
