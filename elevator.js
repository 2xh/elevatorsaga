function newElevStateHandler(elevator) { elevator.handleNewState(); }

function Elevator(speedFloorsPerSec, floorCount, floorHeight, maxUsers, errorHandler) {
    newGuard(this, Elevator);
    Movable.call(this);
    var elevator = this;

    elevator.maxSpeed = floorHeight * speedFloorsPerSec;
    elevator.ACCELERATION = floorHeight * Math.min(speedFloorsPerSec / 2, 4);
    elevator.DECELERATION = elevator.ACCELERATION * 1.25;
    elevator.floorCount = floorCount;
    elevator.floorHeight = floorHeight;
    elevator.maxUsers = maxUsers || 6;
    elevator.currentFloor = 0;
    elevator.velocityY = 0.0;
    // isMoving flag is needed when going to same floor again - need to re-raise events
    elevator.isMoving = false;

    elevator.directionalIndicators = [true, true];
    elevator.destinationQueue = [];

    elevator.approachedFloor = elevator.currentFloor;
    elevator.buttonStates = _.map(_.range(floorCount), function(e, i){ return false; });
    elevator.moveCount = 0;
    elevator.removed = false;
    elevator.userSlots = _.map(_.range(elevator.maxUsers), function(user, i) {
        return { pos: [(i * 8) - 4, 28], user: null};
    });
    elevator.width = elevator.maxUsers * 8;
    elevator.destinationY = 0.0;

    elevator.tryTrigger = function(event, arg1, arg2, arg3, arg4) {
        try {
            elevator.trigger(event, arg1, arg2, arg3, arg4);
        } catch(e) { errorHandler(e); }
    };

    elevator.on("new_state", newElevStateHandler);
};
Elevator.prototype = Object.create(Movable.prototype);

Elevator.prototype.accelDistance = function(targetSpeed) {
    // v² = u² + 2a * d
    return (Math.pow(targetSpeed, 2) - Math.pow(this.velocityY, 2)) / (2 * (targetSpeed - this.velocityY === Math.sign(this.velocityY) ? this.ACCELERATION : this.DECELERATION) * 0.95);
};
Elevator.prototype.accelNeeded = function(targetSpeed, distance) {
    // v² = u² + 2a * d
    return 0.5 * ((Math.pow(targetSpeed, 2) - Math.pow(this.velocityY, 2)) / (distance * 0.95));
};

Elevator.prototype.setFloorPosition = function(floor) {
    var destination = this.getYPosOfFloor(floor);
    this.currentFloor = floor;
    this.approachedFloor = floor;
    this.moveTo(null, destination);
};

Elevator.prototype.userEntering = function(user) {
    for(var i=0; i<this.userSlots.length; i++) {
        var slot = this.userSlots[i];
        if(slot.user === null) {
            slot.user = user;
            return slot.pos;
        }
    }
    return null;
};

Elevator.prototype.pressFloorButton = function(floorNumber) {
    floorNumber = Math.clamp(floorNumber, 0, this.floorCount - 1);
    if(!this.buttonStates[floorNumber]) {
        this.buttonStates[floorNumber] = true;
        this.tryTrigger("floor_button_pressed", floorNumber);
        this.tryTrigger("floor_buttons_changed", this.buttonStates, floorNumber);
    }
};

Elevator.prototype.userExiting = function(user) {
    for(var i=0; i<this.userSlots.length; i++) {
        var slot = this.userSlots[i];
        if(slot.user === user) {
            slot.user = null;
        }
    }
};

Elevator.prototype.updateElevatorMovement = function(dt) {
    if(this.isBusy()) {
        // TODO: Consider if having a nonzero velocity here should throw error..
        return;
    }

    var destinationDiff = this.destinationY - this.y;
    var directionSign = Math.sign(destinationDiff);
    var velocitySign = Math.sign(this.velocityY);
    var acceleration = this.ACCELERATION * Math.min(directionSign * destinationDiff / this.floorHeight, 1);

    if(directionSign === velocitySign) {
        // Moving in correct direction
        var distanceNeededToStop = this.accelDistance(0.0);
        if(distanceNeededToStop * 1.1 < -directionSign * destinationDiff) {
            // Slow down
            var requiredDeceleration = this.accelNeeded(0.0, destinationDiff);
            var deceleration = Math.min(this.DECELERATION, -directionSign * requiredDeceleration);
            this.velocityY -= directionSign * deceleration * dt;
        } else {
            // Speed up (or keep max speed...)
            this.velocityY += directionSign * acceleration * dt;
        }
    } else if(destinationDiff !== 0.0 && velocitySign === 0) {
        // Standing still - should accelerate
        this.velocityY += directionSign * acceleration * dt;
        if(Math.round(this.getDestinationFloor()) !== this.currentFloor) {
            this.moveCount++;
        }
    } else {
        // Moving in wrong direction - decelerate as much as possible
        this.velocityY -= velocitySign * this.DECELERATION * dt;
        // Make sure we don't change direction within this time step - let standstill logic handle it
        if(Math.sign(this.velocityY) !== velocitySign) {
            this.velocityY = 0.0;
        }
    }

    // Make sure we're not speeding
    this.velocityY = Math.clamp(this.velocityY, -this.maxSpeed, this.maxSpeed);

    if(directionSign * destinationDiff < 0.2 && velocitySign * this.velocityY < 1) {
        // Snap to destination and stop
        this.moveTo(null, this.destinationY);
        this.velocityY = 0.0;
        this.isMoving = false;
        this.handleDestinationArrival();
        return;
    }

    // Move elevator
    this.moveTo(null, this.y + this.velocityY * dt);
};

Elevator.prototype.handleDestinationArrival = function() {
    this.tryTrigger("stopped", this.getExactCurrentFloor());
    if(this.destinationQueue.length && this.destinationQueue[0] === this.getDestinationFloor()) {
        this.destinationQueue.shift();
    }
    if(this.isOnAFloor()) {
        this.buttonStates[this.currentFloor] = false;
        this.tryTrigger("floor_buttons_changed", this.buttonStates, this.currentFloor);
        this.tryTrigger("stopped_at_floor", this.currentFloor);
        // Need to allow users to get off first, so that new ones
        // can enter on the same floor
        this.tryTrigger("exit_available", this.currentFloor, this);
        if(!this.isFull()) {
            this.tryTrigger("entrance_available", this);
        }
        this.tryTrigger("indicatorstate_change", this.directionalIndicators);
        this.wait(1, this.checkDestinationQueue);
    } else {
        this.checkDestinationQueue();
    };
};

Elevator.prototype.moveToFloor = function(floor) {
    this.isMoving = true;
    this.destinationY = this.getYPosOfFloor(floor);
};

Elevator.prototype.goToFloor = function(floor) {
    floor = Math.clamp(floor, 0, this.floorCount - 1);
    if(!this.destinationQueue.length || this.destinationQueue[0] !== floor){
        this.destinationQueue.unshift(floor);
    }
    this.checkDestinationQueue();
};

Elevator.prototype.stop = function() {
    this.destinationQueue = [];
    this.moveToFloor(this.getExactFutureFloorIfStopped());
};

Elevator.prototype.getPressedFloors = function() {
    for(var i=0, arr=[]; i<this.buttonStates.length; i++) {
        if(this.buttonStates[i]) {
            arr.push(i);
        }
    }
    return arr;
};

Elevator.prototype.checkDestinationQueue = function() {
    this.tryTrigger("indicatorstate_change", this.directionalIndicators);
    if(!this.isBusy()){
        if(this.destinationQueue.length) {
            this.moveToFloor(this.destinationQueue[0]);
        } else {
            this.tryTrigger("idle");
        }
    }
};

Elevator.prototype.isSuitableForTravelBetween = function(fromFloorNum, toFloorNum) {
    var direction = toFloorNum - fromFloorNum;
    if(direction > 0) {
        return this.directionalIndicators[0];
    } else if(direction < 0) {
        return this.directionalIndicators[1];
    } else {
        return true;
    }
};

Elevator.prototype.getYPosOfFloor = function(floorNum) {
    return (this.floorCount - 1) * this.floorHeight - floorNum * this.floorHeight;
};

Elevator.prototype.getExactFloorOfYPos = function(y) {
    return ((this.floorCount - 1) * this.floorHeight - y) / this.floorHeight;
};

Elevator.prototype.getExactCurrentFloor = function() {
    return this.getExactFloorOfYPos(this.y);
};

Elevator.prototype.getDestinationFloor = function() {
    return this.getExactFloorOfYPos(this.destinationY);
};

Elevator.prototype.getExactFutureFloorIfStopped = function() {
    var distanceNeededToStop = this.accelDistance(0.0);
    return this.getExactFloorOfYPos(this.y - Math.sign(this.velocityY) * distanceNeededToStop);
};

Elevator.prototype.isApproachingFloor = function(floorNum) {
    var floorYPos = this.getYPosOfFloor(floorNum);
    var elevToFloor = floorYPos - this.y;
    return this.velocityY !== 0.0 && (Math.sign(this.velocityY) === Math.sign(elevToFloor));
};

Elevator.prototype.isOnAFloor = function() {
    return Math.fequal(this.getExactCurrentFloor(), Math.round(this.getExactCurrentFloor()));
};

Elevator.prototype.loadFactor = function() {
    var load = _.reduce(this.userSlots, function(sum, slot) { return sum + (slot.user ? slot.user.weight : 0); }, 0);
    return load / (this.maxUsers * 80);
};

Elevator.prototype.getMaxSpeed = function() {
    return this.maxSpeed / this.floorHeight;
};

Elevator.prototype.isFull = function() {
    for(var i=0; i<this.userSlots.length; i++) { if(this.userSlots[i].user === null) { return false; } }
    return true;
};
Elevator.prototype.isEmpty = function() {
    for(var i=0; i<this.userSlots.length; i++) { if(this.userSlots[i].user !== null) { return false; } }
    return true;
};

Elevator.prototype.handleNewState = function() {
    // Recalculate the floor number etc
    var currentFloor = Math.round(this.getExactCurrentFloor());
    if(currentFloor !== this.currentFloor) {
        this.currentFloor = currentFloor;
        this.tryTrigger("new_current_floor", this.currentFloor);
    }

    // Check if we are about to pass a floor
    var approachingFloor = Math.round(this.getExactFutureFloorIfStopped());
    if(approachingFloor !== this.approachedFloor) {
        // The following is somewhat ugly.
        // A formally correct solution should iterate and generate events for all passed floors,
        // because the elevator could theoretically have such a velocity that it would
        // pass more than one floor over the course of one state change (update).
        // But I can't currently be arsed to implement it because it's overkill.

        // Never emit passing_floor event for the destination floor
        // Because if it's the destination we're not going to pass it, at least not intentionally
        if(this.getDestinationFloor() !== approachingFloor) {
            var direction = approachingFloor - currentFloor;
            this.tryTrigger("passing_floor", approachingFloor, direction);
        }
        this.approachedFloor = approachingFloor;
    }
};
