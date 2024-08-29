
function clearAll($elems) {
    _.each($elems, function($elem) {
        while($elem.firstChild) {
            $elem.removeChild($elem.firstChild);
        }
    });
};

function setTransformPos(elem, x, y) {
    var style = "translate(" + x + "px," + y + "px) translateZ(0)";
    elem.style.transform = style;
    elem.style["-ms-transform"] = style;
    elem.style["-webkit-transform"] = style;
};

function updateUserState($user, user) {
    setTransformPos($user, user.worldX, user.worldY);
    if(user.done) { $user.addClass("leaving"); }
};


function presentStats($parent, world) {

    var elem_transportedcounter = $parent.querySelector(".transportedcounter"),
        elem_elapsedtime = $parent.querySelector(".elapsedtime"),
        elem_transportedpersec = $parent.querySelector(".transportedpersec"),
        elem_avgwaittime = $parent.querySelector(".avgwaittime"),
        elem_maxwaittime = $parent.querySelector(".maxwaittime"),
        elem_movecount = $parent.querySelector(".movecount");

    world.on("stats_display_changed", function updateStats() {
        elem_transportedcounter.textContent = world.transportedCounter;
        elem_elapsedtime.textContent = world.elapsedTime.toFixed(2) + "s";
        elem_transportedpersec.textContent = world.transportedPerSec.toPrecision(4);
        elem_avgwaittime.textContent = world.avgWaitTime.toPrecision(4) + "s";
        elem_maxwaittime.textContent = world.maxWaitTime.toPrecision(4) + "s";
        elem_movecount.textContent = world.moveCount;
    });
    world.trigger("stats_display_changed");
};

function presentChallenge($parent, challenge, app, world, worldController, challengeNum, challengeTempl) {
    var $challenge = riot.render(challengeTempl, {
        challenge: challenge,
        num: challengeNum,
        timeScale: worldController.timeScale.toFixed(0) + "x",
        startButtonText: world.challengeEnded ? "⟲ Restart" : (worldController.isPaused ? "Start" : "Pause")
    });
    $parent.innerHTML = $challenge;

    $parent.querySelector(".startstop").addEventListener("click", function() {
        app.startStopOrRestart();
    });
    $parent.querySelector(".timescale_increase").addEventListener("click", function(e) {
        e.preventDefault();
        worldController.setTimeScale(Math.round(worldController.timeScale * 2));
    });
    $parent.querySelector(".timescale_decrease").addEventListener("click", function(e) {
        e.preventDefault();
        worldController.setTimeScale(Math.round(worldController.timeScale / 2));
    });
};

function presentFeedback($parent, feedbackTempl, world, title, message, url) {
    $parent.innerHTML = riot.render(feedbackTempl, {title: title, message: message, url: url, paddingTop: world.floors.length * world.floorHeight * 0.2});
    if(!url) {
        var a = $parent.querySelector("a");
        a.parentNode.removeChild(a);
    }
};

function presentWorld($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {
    $world.style.height = world.floorHeight * world.floors.length + "px";

    _.each(world.floors, function(f) {
        var $floor = document.createElement("span");
        $floor.innerHTML = riot.render(floorTempl, f);
        $floor = $floor.childNodes[0];
        var $up = $floor.querySelector(".up");
        var $down = $floor.querySelector(".down");
        f.on("buttonstate_change", function(buttonStates) {
            buttonStates[0] ? $up.addClass("activated") : $up.removeClass("activated");
            buttonStates[1] ? $down.addClass("activated") : $down.removeClass("activated");
        });
        $up.addEventListener("click", function() {
            f.pressButton(1);
        });
        $down.addEventListener("click", function() {
            f.pressButton(-1);
        });
        $world.appendChild($floor);
    });

    function renderElevatorButtons(states) {
        // This is a rarely executed inner-inner loop, does not need efficiency
        return _.map(states, function(b, i) {
            return riot.render(elevatorButtonTempl, {floorNum: i});
        }).join("");
    };

    function setUpElevator(e) {
        var $elevator = document.createElement("span");
        $elevator.innerHTML = riot.render(elevatorTempl, {e: e});
        $elevator = $elevator.childNodes[0];
        $elevator.querySelector(".buttonindicator").innerHTML = renderElevatorButtons(e.buttonStates);
        var $buttons = $elevator.querySelector(".buttonindicator").children;
        var elem_floorindicator = $elevator.querySelector(".floorindicator > span");

        _.each($buttons, function(b) {
            b.addEventListener("click", function(){
                e.pressFloorButton(parseInt(this.textContent));
            });
        });
        e.on("new_display_state", function updateElevatorPosition() {
            setTransformPos($elevator, e.worldX, e.worldY);
        });
        e.on("new_current_floor", function update_current_floor(floor) {
            elem_floorindicator.textContent = floor;
        });
        e.on("floor_buttons_changed", function update_floor_buttons(states, indexChanged) {
            states[indexChanged] ? $buttons[indexChanged].addClass("activated") : $buttons[indexChanged].removeClass("activated");
        });
        e.on("indicatorstate_change", function indicatorstate_change(indicatorStates) {
            indicatorStates[0] ? $elevator.querySelector(".up").addClass("activated") : $elevator.querySelector(".up").removeClass("activated");
            indicatorStates[1] ? $elevator.querySelector(".down").addClass("activated") : $elevator.querySelector(".down").removeClass("activated");
        });
        e.trigger("new_state", e);
        e.trigger("new_display_state", e);
        e.trigger("new_current_floor", e.currentFloor);
        return $elevator;
    }

    _.each(world.elevators, function(e) {
        $world.appendChild(setUpElevator(e));
    });

    world.on("new_user", function(user) {
        var $user = document.createElement("span");
        $user.innerHTML = riot.render(userTempl, {u: user, state: user.done ? "leaving" : ""});
        $user = $user.childNodes[0];
        user.on("new_display_state", function() { updateUserState($user, user); })
        user.on("removed", function() {
            $world.removeChild($user);
        });
        $world.appendChild($user);
    });
};


function presentCodeStatus($parent, templ, error) {
    console.log(error);
    var errorDisplay = error ? "block" : "none";
    var successDisplay = error ? "none" : "block";
    var errorMessage = error;
    if(error && error.stack) {
        errorMessage = error.stack;
        errorMessage = errorMessage.replace(/\n/g, "<br>");
    }
    var status = riot.render(templ, {errorMessage: errorMessage, errorDisplay: errorDisplay, successDisplay: successDisplay});
    $parent.innerHTML = status;
};

function makeDemoFullscreen() {
    _.each(document.querySelectorAll("body .container > *:not(.world)"), function(e){e.style.visibility = "hidden"});
    _.each(document.querySelectorAll("html, body, body .container, .world"), function(e){e.style.width = "100%", e.style.margin = 0, e.style.padding = 0});
};
