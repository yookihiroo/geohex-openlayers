//*** GeoHex by sa2da is licensed under a Creative Commons BY-SA 2.1 Japan License. ***//

(function (win) {	// グローバルを汚さないように関数化

// namspace GeoHex;	// require hex_v2_core.js
if (!win.GeoHex)	return;

// require google.maps.version >= 3
if (!win.OpenLayers)	return;

var Zone = GeoHex.getZoneByCode('aaa').constructor;

var World = (function () {
	var count = 0;
	var fn = function (map) {
		this.map = map;
		this.stamp = {};	// Zone(HexCode)に対する描画済みHexPolygonのキャッシュ
		this.onDrawHex = [];
	};
	var _commonOnDrawHex = [];
	fn.prototype.fireOnDrawHex = function (zone, polygon, properties) {
		for (var idx = 0, l = _commonOnDrawHex.length; idx < l; idx++) {
			_commonOnDrawHex[idx].call(null, this.map, zone, polygon, properties);
		}
		for (var idx = 0, l = this.onDrawHex.length; idx < l; idx++) {
			this.onDrawHex[idx].call(null, this.map, zone, polygon, properties);
		}
	}
	var _stack = [];
	return {
		get: function (map) {
			var idx = map.ghxid;
			if (!idx || !_stack[idx]) {
				idx = map.ghxid = ++count;
				_stack[count] = new fn(map);
			}
			return _stack[idx];
		},
		reg: function (map, onDrawHex) {
			if (arguments.length < 2) {
				onDrawHex = map;
				_commonOnDrawHex.push(onDrawHex);
			} else {
				World.get(map).onDrawHex.push(onDrawHex);
			}
		}
	};
})();

//var h_stamp = {};	// → World.get(map)::stamp に置換

var def_prop = {
	linecolor: "#FF0000",
	fillcolor: "#FF8a00"
};	// ＊＊＊ popinfoは非標準プロパティ ＊＊＊

var $merge = function (org, src) {
	org || (org = {});
	src || (src = {});
	var dest = {};
	for (var idx in org) if (org.hasOwnProperty(idx)) {
		dest[idx] = org[idx];
	}
	for (var idx in src) if (src.hasOwnProperty(idx)) {
		dest[idx] = src[idx];
	}
	return dest;
};
var forward = function(layer, lat, lon) {
    var p = new OpenLayers.Geometry.Point(lon, lat);
    var map = layer.map;
    return OpenLayers.Projection.transform(p, map.displayProjection, map.projection);
};
// in OpenLayers, [map] means [layer]
Zone.prototype.drawHex = function (map, properties) {
    var world = World.get(map);
    var hex = world.stamp[this.code];
    if (!hex) {
        var prop = $merge(def_prop, properties);
        // キャッシュのプロトタイプ
        hex = { prop: prop, linear: null, instance: null };

        var coords = this.getHexCoords();
        var h_top = coords[1].lat;	// top-left
        var h_btm = coords[4].lat;	// bottom-right
        if ((h_btm > 85.051128514) || (h_top < -85.051128514))	return;

        var level = this.getLevel();
        var len = 6;	// == coords.length
        var oCoords = new Array(len);
        for (var idx = 0; idx < len; idx++) {
            oCoords[idx] = forward(map, coords[idx].lat, coords[idx].lon);
        }
        oCoords.push(oCoords[0]);
        hex.linear = new OpenLayers.Geometry.LinearRing(oCoords);

        world.stamp[this.code] = hex;
    } else if (properties) {
        hex.prop = $merge(hex.prop, properties);
    }

    hex.instance = new OpenLayers.Feature.Vector(hex.linear);
    hex.instance.attributes = hex.prop;
    map.addFeatures([hex.instance]);
    // PostProcess
    world.fireOnDrawHex(this, hex.instance, prop);
};
Zone.prototype.eraseHex = function (map) {
    var hex = World.get(map).stamp[this.code];
    if (hex.instance) hex.instance.destroy();
    delete hex.instance;
}

// EXPORT
GeoHex.registOnDrawHex = World.reg;

})(this);
