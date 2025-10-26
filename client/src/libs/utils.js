var mathABS = Math.abs;
var mathCOS = Math.cos;
var mathSIN = Math.sin;
var mathPOW = Math.pow;
var mathSQRT = Math.sqrt;
var mathABS = Math.abs;
var mathATAN2 = Math.atan2;
var mathPI = Math.PI;

module.exports.randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
module.exports.randFloat = function (min, max) {
    return Math.random() * (max - min + 1) + min;
};
module.exports.lerp = function (value1, value2, amount) {
    return value1 + (value2 - value1) * amount;
};
module.exports.decel = function (val, cel) {
    if (val > 0)
        val = Math.max(0, val - cel);
    else if (val < 0)
        val = Math.min(0, val + cel);
    return val;
};
module.exports.getDistance = function (x1, y1, x2, y2) {
    return mathSQRT((x2 -= x1) * x2 + (y2 -= y1) * y2);
};
module.exports.getDirection = function (x1, y1, x2, y2) {
    return mathATAN2(y1 - y2, x1 - x2);
};
module.exports.getAngleDist = function (a, b) {
    var p = mathABS(b - a) % (mathPI * 2);
    return (p > mathPI ? (mathPI * 2) - p : p);
};
module.exports.isNumber = function (n) {
    return (typeof n == "number" && !isNaN(n) && isFinite(n));
};
module.exports.isString = function (s) {
    return (s && typeof s == "string");
};
module.exports.kFormat = function (num) {
    return num > 999 ? (num / 1000).toFixed(1) + 'k' : num;
};
module.exports.capitalizeFirst = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
module.exports.fixTo = function (n, v) {
    return parseFloat(n.toFixed(v));
};
module.exports.sortByPoints = function (a, b) {
    return parseFloat(b.points) - parseFloat(a.points);
};
module.exports.lineInRect = function (recX, recY, recX2, recY2, x1, y1, x2, y2) {
    var minX = x1;
    var maxX = x2;
    if (x1 > x2) {
        minX = x2;
        maxX = x1;
    }
    if (maxX > recX2)
        maxX = recX2;
    if (minX < recX)
        minX = recX;
    if (minX > maxX)
        return false;
    var minY = y1;
    var maxY = y2;
    var dx = x2 - x1;
    if (Math.abs(dx) > 0.0000001) {
        var a = (y2 - y1) / dx;
        var b = y1 - a * x1;
        minY = a * minX + b;
        maxY = a * maxX + b;
    }
    if (minY > maxY) {
        var tmp = maxY;
        maxY = minY;
        minY = tmp;
    }
    if (maxY > recY2)
        maxY = recY2;
    if (minY < recY)
        minY = recY;
    if (minY > maxY)
        return false;
    return true;
};
module.exports.containsPoint = function (element, x, y) {
    var bounds = element.getBoundingClientRect();
    var left = bounds.left + window.scrollX;
    var top = bounds.top + window.scrollY;
    var width = bounds.width;
    var height = bounds.height;

    var insideHorizontal = x > left && x < left + width;
    var insideVertical = y > top && y < top + height;
    return insideHorizontal && insideVertical;
};
module.exports.mousifyTouchEvent = function (event) {
    var touch = event.changedTouches[0];
    event.screenX = touch.screenX;
    event.screenY = touch.screenY;
    event.clientX = touch.clientX;
    event.clientY = touch.clientY;
    event.pageX = touch.pageX;
    event.pageY = touch.pageY;
};
module.exports.hookTouchEvents = function (element, skipPrevent) {
    var preventDefault = !skipPrevent;
    var isHovering = false;

    var passive = false;
    element.addEventListener("touchstart", module.exports.checkTrusted(touchStart), passive);
    element.addEventListener("touchmove", module.exports.checkTrusted(touchMove), passive);
    element.addEventListener("touchend", module.exports.checkTrusted(touchEnd), passive);
    element.addEventListener("touchcancel", module.exports.checkTrusted(touchEnd), passive);
    element.addEventListener("touchleave", module.exports.checkTrusted(touchEnd), passive);

    function touchStart(e) {
        module.exports.mousifyTouchEvent(e);
        window.setUsingTouch(true);
        if (preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (element.onmouseover)
            element.onmouseover(e);
        isHovering = true;
    }

    function touchMove(e) {
        module.exports.mousifyTouchEvent(e);
        window.setUsingTouch(true);
        if (preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (module.exports.containsPoint(element, e.pageX, e.pageY)) {
            if (!isHovering) {
                if (element.onmouseover)
                    element.onmouseover(e);
                isHovering = true;
            }
        } else {
            if (isHovering) {
                if (element.onmouseout)
                    element.onmouseout(e);
                isHovering = false;
            }
        }
    }

    function touchEnd(e) {
        module.exports.mousifyTouchEvent(e);
        window.setUsingTouch(true);
        if (preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isHovering) {
            if (element.onclick)
                element.onclick(e);
            if (element.onmouseout)
                element.onmouseout(e);
            isHovering = false;
        }
    }
};
module.exports.removeAllChildren = function (element) {
    while (element.hasChildNodes()) {
        element.removeChild(element.lastChild);
    }
};
module.exports.generateElement = function (config) {
    var element = document.createElement(config.tag || "div");

    function bind(configValue, elementValue) {
        if (config[configValue])
            element[elementValue] = config[configValue];
    }
    bind("text", "textContent");
    bind("html", "innerHTML");
    bind("class", "className");
    for (var key in config) {
        switch (key) {
        case "tag":
        case "text":
        case "html":
        case "class":
        case "style":
        case "hookTouch":
        case "parent":
        case "children":
            continue;
        default:
            break;
        }
        element[key] = config[key];
    }
    if (element.onclick)
        element.onclick = module.exports.checkTrusted(element.onclick);
    if (element.onmouseover)
        element.onmouseover = module.exports.checkTrusted(element.onmouseover);
    if (element.onmouseout)
        element.onmouseout = module.exports.checkTrusted(element.onmouseout);
    if (config.style) {
        element.style.cssText = config.style;
    }
    if (config.hookTouch) {
        module.exports.hookTouchEvents(element);
    }
    if (config.parent) {
        config.parent.appendChild(element);
    }
    if (config.children) {
        for (var i = 0; i < config.children.length; i++) {
            element.appendChild(config.children[i]);
        }
    }
    return element;
}
module.exports.eventIsTrusted = function (ev) {
    if (ev && typeof ev.isTrusted == "boolean") {
        return ev.isTrusted;
    } else {
        return true;
    }
}
module.exports.checkTrusted = function (callback) {
    return function (ev) {
        if (ev && ev instanceof Event && module.exports.eventIsTrusted(ev)) {
            callback(ev);
        } else {

        }
    }
}
module.exports.randomString = function (length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
module.exports.countInArray = function (array, val) {
    var count = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i] === val) count++;
    }
    return count;
};