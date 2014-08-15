


var asElevator = function(movable, speedFloorsPerSec, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.inTransit = false;
    movable.removed = false;
    movable.userSlots = [
        {pos: [2, 30], user: null},
        {pos: [12, 30], user: null},
        {pos: [22, 30], user: null},
        {pos: [32, 30], user: null}];


    movable.setFloorPosition = function(floor) {
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;
        movable.moveTo(null, destination);
        movable.currentFloor = floor;
        movable.destinationFloor = floor;
        movable.onNewState();
    }

    movable.userEntering = function(user) {
        for(var i=0; i<movable.userSlots.length; i++) {
            var slot = movable.userSlots[i];
            if(slot.user === null) {
                slot.user = user;
                return slot.pos;
            }
        }
        return false;
    }

    movable.userExiting = function(user) {
        _.each(movable.userSlots, function(slot) {
            if(slot.user === user) {
                slot.user = null;
            }
        });
    }

    movable.goToFloor = function(floor, cb) {
        if(movable.inTransit) { throw "Can not move to new floor while in transit"; }
        if(movable.removed) { return cb("This elevator has been removed") };
        movable.inTransit = true;
        movable.destinationFloor = floor;
        var distance = Math.abs(movable.destinationFloor - movable.currentFloor);
        var timeToTravel = 1000.0 * distance / speedFloorsPerSec;
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;

        movable.moveToOverTime(null, destination, timeToTravel, undefined, function() {
            movable.currentFloor = movable.destinationFloor;
            movable.onNewCurrentFloor();
            movable.onStoppedAtFloor();
            // Need to allow users to get off first, so that new ones
            // can enter on the same floor
            movable.onExitAvailable();
            movable.onEntranceAvailable();
            movable.inTransit = false;
            if(cb) { cb(); }
        });
    }

    movable.onNewState(function() {
        // Recalculate the floor number
        var currentFloor = Math.round(((floorCount - 1) * floorHeight - movable.y) / floorHeight);
        if(currentFloor != movable.currentFloor) {
            movable.currentFloor = currentFloor;
            movable.onNewCurrentFloor();
        }
    });

    movable = asEmittingEvent(movable, "onStoppedAtFloor");
    movable = asEmittingEvent(movable, "onExitAvailable");
    movable = asEmittingEvent(movable, "onEntranceAvailable");
    movable = asEmittingEvent(movable, "onNewCurrentFloor");

    return movable;
}