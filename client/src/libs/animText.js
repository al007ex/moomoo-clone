module.exports.AnimText = function () {

    this.init = function (x, y, scale, speed, life, text, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.scale = scale;
        this.startScale = this.scale;
        this.maxScale = scale * 1.5;
        this.scaleSpeed = 0.7;
        this.speed = speed;
        this.life = life;
        this.text = text;
    };

    this.update = function (delta) {
        if (this.life) {
            this.life -= delta;
            this.y -= this.speed * delta;
            this.scale += this.scaleSpeed * delta;
            if (this.scale >= this.maxScale) {
                this.scale = this.maxScale;
                this.scaleSpeed *= -1;
            } else if (this.scale <= this.startScale) {
                this.scale = this.startScale;
                this.scaleSpeed = 0;
            }
            if (this.life <= 0) {
                this.life = 0;
            }
        }
    };

    this.render = function (ctxt, xOff, yOff) {
        ctxt.fillStyle = this.color;
        ctxt.font = this.scale + "px Hammersmith One";
        ctxt.fillText(this.text, this.x - xOff, this.y - yOff);
    };

}

module.exports.TextManager = function () {
    this.texts = [];

    this.update = function (delta, ctxt, xOff, yOff) {
        ctxt.textBaseline = "middle";
        ctxt.textAlign = "center";
        for (var i = 0; i < this.texts.length; ++i) {
            if (this.texts[i].life) {
                this.texts[i].update(delta);
                this.texts[i].render(ctxt, xOff, yOff);
            }
        }
    };

    this.showText = function (x, y, scale, speed, life, text, color) {
        var tmpText;
        for (var i = 0; i < this.texts.length; ++i) {
            if (!this.texts[i].life) {
                tmpText = this.texts[i];
                break;
            }
        }
        if (!tmpText) {
            tmpText = new module.exports.AnimText();
            this.texts.push(tmpText);
        }
        tmpText.init(x, y, scale, speed, life, text, color);
    };
}