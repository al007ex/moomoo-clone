window.cpmstarAPI = () => {};

const is_prod = location.protocol === "https:";
const ws_url = `ws${is_prod ? "s": ""}://${location.host}`;

setInterval(() => {

    // ping so server will alive
    fetch(`${origin}/ping`).then(x => x.text()).then(x => {
        // console.info(x);
    });

}, 50000);

window.connected_count = 0;

window.WebSocket = class extends WebSocket {

    constructor(_url, a) {
        super(ws_url, a);
        window.connected_count++;
    }

}

const shrink = 0.4;

let c = setInterval(() => {

    if (window.config) {
        window.config.mapScale = 14400 * shrink;
        window.config.snowBiomeTop = 2400 * shrink;
        window.config.riverWidth = 724 * shrink;
        window.config.riverPadding = 114 * shrink;
        window.config.weaponVariants = [{
            id: 0,
            src: "",
            xp: 0,
            val: 1
        }, {
            id: 1,
            src: "_g",
            xp: 3000,
            val: 1.1
        }, {
            id: 2,
            src: "_d",
            xp: 7000,
            val: 1.18
        }, {
            id: 3,
            src: "_r",
            poison: true,
            xp: 12000,
            val: 1.18
        }, {
            id: 4,
            src: "_e",
            poison: true,
            xp: 24000,
            val: 1.18
        }];
    }

    if (!window?.captchaCallback) return;
    
    window.captchaCallback();
    window.onload({});

    clearInterval(c);

}, 100);

Object.defineProperty(Object.prototype, "start", {
    get() {
        return this["‎start"];
    },
    set(val) {

        if (this.hasOwnProperty("regionInfo")) {
            this["‎start"] = a => a();
            return;

        }
        this["‎start"] = val;

    }
});

window.grecaptcha = {
    execute() {
        return new Promise(res => res("aaaaafg"))
    }
};