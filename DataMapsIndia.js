(function () {
    var svg;

    // Save off default references
    var d3 = window.d3, topojson = window.topojson;

    var defaultOptions = {
        scope: 'world',
        responsive: false,
        aspectRatio: 0.5625,
        setProjection: setProjection,
        projection: 'equirectangular',
        dataType: 'json',
        data: {},
        done: function () { },
        fills: {
            defaultFill: '#ABDDA4'
        },
        filters: {},
        geographyConfig: {
            dataUrl: null,
            hideAntarctica: true,
            hideHawaiiAndAlaska: false,
            borderWidth: 1,
            borderOpacity: 1,
            borderColor: '#FDFDFD',
            popupTemplate: function (geography, data) {
                return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
            },
            popupOnHover: true,
            highlightOnHover: true,
            highlightFillColor: '#FC8D59',
            highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
            highlightBorderWidth: 2,
            highlightBorderOpacity: 1
        },
        projectionConfig: {
            rotation: [97, 0]
        },
        bubblesConfig: {
            borderWidth: 2,
            borderOpacity: 1,
            borderColor: '#FFFFFF',
            popupOnHover: true,
            radius: null,
            popupTemplate: function (geography, data) {
                return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
            },
            fillOpacity: 0.75,
            animate: true,
            highlightOnHover: true,
            highlightFillColor: '#FC8D59',
            highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
            highlightBorderWidth: 2,
            highlightBorderOpacity: 1,
            highlightFillOpacity: 0.85,
            exitDelay: 100,
            key: JSON.stringify
        }
    };

    /*
      Getter for value. If not declared on datumValue, look up the chain into optionsValue
    */
    function val(datumValue, optionsValue, context) {
        if (typeof context === 'undefined') {
            context = optionsValue;
            optionsValues = undefined;
        }
        var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

        if (typeof value === 'undefined') {
            return null;
        }

        if (typeof value === 'function') {
            var fnContext = [context];
            if (context.geography) {
                fnContext = [context.geography, context.data];
            }
            return value.apply(null, fnContext);
        }
        else {
            return value;
        }
    }

    function addContainer(element, height, width) {
        this.svg = d3.select(element).append('svg')
            .attr('width', width || element.offsetWidth)
            .attr('data-width', width || element.offsetWidth)
            .attr('class', 'datamap')
            .attr('height', height || element.offsetHeight)
            .style('overflow', 'hidden'); // IE10+ doesn't respect height/width when map is zoomed in

        if (this.options.responsive) {
            d3.select(this.options.element).style({ 'position': 'relative', 'padding-bottom': (this.options.aspectRatio * 100) + '%' });
            d3.select(this.options.element).select('svg').style({ 'position': 'absolute', 'width': '100%', 'height': '100%' });
            d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');
        }

        return this.svg;
    }

    // setProjection takes the svg element and options - optimized for India/world only
    function setProjection(element, options) {
        var width = options.width || element.offsetWidth;
        var height = options.height || element.offsetHeight;
        var projection, path;
        var svg = this.svg;

        if (options && typeof options.scope === 'undefined') {
            options.scope = 'world';
        }

        // Simplified projection - only world scope needed for India
        projection = d3.geo[options.projection]()
            .scale((width + 1) / 2 / Math.PI)
            .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);

        if (options.projection === 'orthographic') {
            svg.append("defs").append("path")
                .datum({ type: "Sphere" })
                .attr("id", "sphere")
                .attr("d", path);

            svg.append("use")
                .attr("class", "stroke")
                .attr("xlink:href", "#sphere");

            svg.append("use")
                .attr("class", "fill")
                .attr("xlink:href", "#sphere");
            projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
        }

        path = d3.geo.path()
            .projection(projection);

        return { path: path, projection: projection };
    }

    function addStyleBlock() {
        if (d3.select('.datamaps-style-block').empty()) {
            d3.select('head').append('style').attr('class', 'datamaps-style-block')
                .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path:not(.datamaps-arc), .datamap circle, .datamap line {stroke: #FFFFFF; vector-effect: non-scaling-stroke; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
        }
    }

    function drawSubunits(data) {
        var fillData = this.options.fills,
            colorCodeData = this.options.data || {},
            geoConfig = this.options.geographyConfig;

        var subunits = this.svg.select('g.datamaps-subunits');
        if (subunits.empty()) {
            subunits = this.addLayer('datamaps-subunits', null, true);
        }

        var geoData = topojson.feature(data, data.objects[this.options.scope]).features;
        if (geoConfig.hideAntarctica) {
            geoData = geoData.filter(function (feature) {
                return feature.id !== "ATA";
            });
        }

        var paths = subunits.selectAll('path.datamaps-subunit').data(geoData);

        paths.enter()
            .append('path')
            .attr('d', this.path)
            .attr('class', 'datamaps-subunit')
            .attr('data-name', function (d) {
                return d.properties.name;
            })
            .attr('data-id', function (d) {
                return d.id;
            })
            .style('fill', function (d) {
                var fillColor;

                var data = colorCodeData[d.id];
                if (data) {
                    fillColor = val(data.fillKey, fillData.defaultFill, data);
                    if (typeof fillColor === 'undefined') {
                        fillColor = fillData[data.fillKey] || fillData.defaultFill;
                    }
                } else {
                    fillColor = fillData.defaultFill;
                }
                return fillColor;
            })
            .style('stroke-width', geoConfig.borderWidth)
            .style('stroke-opacity', geoConfig.borderOpacity)
            .style('stroke', geoConfig.borderColor);
    }

    function handleGeographyConfig() {
        var hoverover;
        var $this = d3.select(this);
        var d = $this.data()[0];
        if (this.options.geographyConfig.highlightOnHover || this.options.geographyConfig.popupOnHover) {
            $this.on('mouseover', function () {
                var $this = d3.select(this);
                var datum = $this.data()[0];
                if (this.options.geographyConfig.highlightOnHover) {
                    var previousAttributes = {
                        'fill': $this.style('fill'),
                        'stroke': $this.style('stroke'),
                        'stroke-width': $this.style('stroke-width'),
                        'fill-opacity': $this.style('fill-opacity')
                    };
                    $this
                        .style('fill', val(datum.highlightFillColor, this.options.geographyConfig.highlightFillColor, datum))
                        .style('stroke', val(datum.highlightBorderColor, this.options.geographyConfig.highlightBorderColor, datum))
                        .style('stroke-width', val(datum.highlightBorderWidth, this.options.geographyConfig.highlightBorderWidth, datum))
                        .style('stroke-opacity', val(datum.highlightBorderOpacity, this.options.geographyConfig.highlightBorderOpacity, datum))
                        .style('fill-opacity', val(datum.highlightFillOpacity, this.options.geographyConfig.highlightFillOpacity, datum))
                        .attr('data-previousAttributes', JSON.stringify(previousAttributes));
                }

                if (this.options.geographyConfig.popupOnHover) {
                    this.updatePopup($this, datum, this.options.geographyConfig, svg);
                }
            }.bind(this));

            $this.on('mouseout', function () {
                var $this = d3.select(this);

                if (this.options.geographyConfig.highlightOnHover) {
                    var previousAttributes = JSON.parse($this.attr('data-previousAttributes'));
                    for (var attr in previousAttributes) {
                        $this.style(attr, previousAttributes[attr]);
                    }
                }
                $this.on('mousemove', null);
                d3.select('.datamaps-hoverover').style('display', 'none');
            }.bind(this));
        }

        $this.on('click', function () {
            var data = $this.data()[0];
            if (this.options.geographyConfig.popupOnHover) {
                this.changeState(data);
            }
        }.bind(this));
    }

    function changeState(data) {
        if (typeof this.options.stateChangeSpeed !== 'undefined') {
            d3.select(this.svg[0][0].parentNode).selectAll('.datamaps-subunits').selectAll('*')
                .transition()
                .style('fill', function (d) {
                    var color = val(d.properties, this.options.fills.defaultFill, d);
                    return color || this.options.fills.defaultFill
                }.bind(this))
                .duration(this.options.stateChangeSpeed);
        }
        if (typeof this.options.done === 'function') {
            this.options.done(this);
        }
    }

    function handleBubbles(layer, data, options) {
        var self = this,
            fillData = this.options.fills,
            filterData = this.options.filters,
            svg = this.svg;

        if (!data || (data && !data.slice)) {
            throw "Datamaps Error - bubbles must be an array";
        }

        var bubbles = layer.selectAll('circle.datamaps-bubble').data(data, options.key);

        bubbles
            .enter()
            .append('svg:circle')
            .attr('class', 'datamaps-bubble')
            .attr('cx', function (datum) {
                var latLng;
                if (datumHasCoords(datum)) {
                    latLng = self.latLngToXY(datum.latitude, datum.longitude);
                }
                if (latLng) return latLng[0];
            })
            .attr('cy', function (datum) {
                var latLng;
                if (datumHasCoords(datum)) {
                    latLng = self.latLngToXY(datum.latitude, datum.longitude);
                }
                if (latLng) return latLng[1];
            })
            .attr('r', function (datum) {
                return val(datum.radius, options.radius, datum);
            })
            .attr('data-info', function (d) {
                return JSON.stringify(d);
            })
            .attr('filter', function (datum) {
                var filterKey = filterData[val(datum.filterKey, options.filterKey, datum)];

                if (filterKey) {
                    return filterKey;
                } else {
                    return '';
                }

            })
            .style('stroke', function (datum) {
                return val(datum.borderColor, options.borderColor, datum);
            })
            .style('stroke-width', function (datum) {
                return val(datum.borderWidth, options.borderWidth, datum);
            })
            .style('stroke-opacity', function (datum) {
                return val(datum.borderOpacity, options.borderOpacity, datum);
            })
            .style('fill-opacity', function (datum) {
                return val(datum.fillOpacity, options.fillOpacity, datum);
            })
            .style('fill', function (datum) {
                var fillColor = fillData[val(datum.fillKey, options.fillKey, datum)];
                return fillColor || fillData.defaultFill;
            })
            .on('mouseover', function (datum) {
                var $this = d3.select(this);

                if (options.popupOnHover) {
                    self.updatePopup($this, datum, options, svg);
                }
            })
            .on('mouseout', function (datum) {
                var $this = d3.select(this);

                d3.select('.datamaps-hoverover').style('display', 'none');
            });

        bubbles.transition()
            .duration(options.animate ? 750 : 0)
            .attr('r', function (datum) {
                return val(datum.radius, options.radius, datum);
            });

        bubbles.exit()
            .transition()
            .delay(options.exitDelay)
            .attr('r', 0)
            .remove();

        function datumHasCoords(datum) {
            return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
        }
    }

    // Defaults for each option
    function defaults(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function (source) {
            if (source) {
                for (var prop in source) {
                    // Deep copy if an object is provided
                    if (obj[prop] == null && typeof source[prop] === "object") {
                        obj[prop] = defaults({}, source[prop]);
                    } else if (obj[prop] == null) {
                        obj[prop] = source[prop];
                    }
                }
            }
        });
        return obj;
    }

    function Datamap(options) {
        if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
            throw new Error('Datamaps requires d3 and topojson libraries');
        }

        var self = this;
        var options = defaults(options, defaultOptions);
        this.options = options;

        // Initialize with default options
        this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
        this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
        this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);

        // Add the SVG container
        if (options.element instanceof d3.selection) {
            addContainer.call(this, options.element.node(), options.height, options.width);
        } else if (typeof options.element === 'string') {
            addContainer.call(this, document.getElementById(options.element), options.height, options.width);
        } else {
            addContainer.call(this, options.element, options.height, options.width);
        }

        // Add plugins
        this.addPlugin('bubbles', handleBubbles);

        // Add CSS 
        addStyleBlock();

        return this.draw();
    }

    Datamap.prototype.resize = function () {
        var self = this;
        var options = self.options;

        if (options.responsive) {
            var newsize = options.element.clientWidth,
                oldsize = d3.select(options.element).select('svg').attr('data-width');

            d3.select(options.element).select('svg').selectAll('g').attr('transform', 'scale(' + (newsize / oldsize) + ')');
        }
    };

    Datamap.prototype.draw = function () {
        // Delete all previous layers to avoid memory leaks
        if (this.options.scope === 'world') {
            this.svg.selectAll('g').remove();
        }

        var map = this;
        var options = this.options;

        // Set projections and paths based on scope
        var pathAndProjection = options.setProjection.apply(map, [options.element, options]);

        map.path = pathAndProjection.path;
        map.projection = pathAndProjection.projection;

        // If custom URL for geography is provided, retrieve it and render
        if (options.geographyConfig.dataUrl) {
            d3.json(options.geographyConfig.dataUrl, function (error, results) {
                if (error) throw new Error(error);
                draw(results);
            });
        }
        else {
            draw(options.geographyConfig.dataJson || this[options.scope + 'Topo']);
        }

        function draw(data) {

            // Only draw the map once
            if (typeof options.scope === 'undefined') {
                options.scope = 'world';
            }

            // Setup for tooltips
            if (map.options.geographyConfig.popupOnHover || map.options.bubblesConfig.popupOnHover) {
                d3.select(map.options.element).append('div')
                    .attr('class', 'datamaps-hoverover')
                    .style('z-index', 10001)
                    .style('position', 'absolute');
            }

            // Draw the map
            drawSubunits.call(map, data);
            handleGeographyConfig.call(map);

            if (map.options.geographyConfig.popupOnHover || map.options.bubblesConfig.popupOnHover) {
                d3.select(map.options.element).select('.datamaps-hoverover').style('display', 'none');
            }

            map.options.done(map);
        }
    };

    /**************************************
                  TopoJSON - Only India and World
    ***************************************/
    Datamap.prototype.worldTopo = '__WORLD__';
    Datamap.prototype.indTopo = '__IND__';

    /**************************************
                  Utilities
    ***************************************/

    // Convert lat/lng coords to X / Y coords
    Datamap.prototype.latLngToXY = function (lat, lng) {
        return this.projection([lng, lat]);
    };

    // Add <g> layer to root SVG
    Datamap.prototype.addLayer = function (className, id, first) {
        var layer;
        if (first) {
            layer = this.svg.insert('g', ':first-child')
        }
        else {
            layer = this.svg.append('g')
        }
        return layer.attr('id', id || '')
            .attr('class', className || '');
    };

    Datamap.prototype.updateChoropleth = function (data, options) {
        var svg = this.svg;
        var that = this;

        // When options.reset = true, reset all the fill colors to the defaultFill and kill all data-info
        if (options && options.reset === true) {
            svg.selectAll('.datamaps-subunit')
                .attr('data-info', function () {
                    return "{}"
                })
                .transition().style('fill', this.options.fills.defaultFill)
        }

        for (var subunit in data) {
            if (data.hasOwnProperty(subunit)) {
                var color;
                var subunitData = data[subunit]
                if (!subunitData) {
                    continue;
                }

                if (typeof subunitData === "string") {
                    color = subunitData;
                }
                else if (typeof subunitData.fillKey !== 'undefined') {
                    color = this.options.fills[subunitData.fillKey];
                }

                //if it's an object, overriding the previous data
                if (subunitData.color) {
                    color = subunitData.color;
                }

                svg.selectAll('.' + subunit).transition()
                    .style('fill', color || this.options.fills.defaultFill)
                    .duration(options && options.duration ? options.duration : 1000);

                //then deal with introduced data
                if (subunitData.hasOwnProperty('introduced') && subunitData.introduced === true) {
                    svg.selectAll('.' + subunit)
                        .attr("data-info", JSON.stringify(subunitData));
                }
            }
        }
    };

    Datamap.prototype.updatePopup = function (element, d, options) {
        var popup = d3.select('.datamaps-hoverover'),
            fillData = this.options.fills,
            svg = this.svg,
            options = options || this.options.geographyConfig,
            hoverover = d3.select(options.element).select('.datamaps-hoverover'),
            popupOffsetX = 10,
            popupOffsetY = 10;

        popup.selectAll('.datamaps-tooltip-content').remove()

        popup
            .html(options.popupTemplate(d.geography, d.data))
            .style('width', 'auto')
            .style('height', 'auto')
            .style('top', (d3.event.layerY + popupOffsetY) + "px")
            .style('left', (d3.event.layerX + popupOffsetX) + "px")
            .style('color', 'black')
            .style('border-color', 'rgba(0,0,0,.3)')
            .style('border-width', '1px')
            .style('border-style', 'solid')
            .style('padding', '2px')
            .style('background', 'rgba(255,255,255,0.9)')
            .style('border-radius', '5px')
            .style('font', '12px/1.5 "Helvetica Neue", Arial, Helvetica, sans-serif')
            .style('pointer-events', 'none')
            .style('position', 'absolute')
            .style('display', 'block')
            .transition()
            .duration(200)
            .style('opacity', 1);
    };

    Datamap.prototype.addPlugin = function (name, pluginFn) {
        var self = this;
        if (typeof Datamap.prototype[name] === "undefined") {
            Datamap.prototype[name] = function (data, options, callback, createNewLayer) {
                var layer;
                if (typeof createNewLayer === "undefined") {
                    createNewLayer = false;
                }

                if (typeof options === 'function') {
                    callback = options;
                    options = undefined;
                }

                options = defaults(options || {}, self.options[name + 'Config']);

                //add a single layer, reuse the old layer
                if (!createNewLayer && this.options[name + 'Layer']) {
                    layer = this.options[name + 'Layer'];
                    options = defaults(options, this.options[name + 'Config']);
                }
                else {
                    layer = this.addLayer(name);
                    this.options[name + 'Layer'] = layer;
                }
                pluginFn.apply(this, [layer, data, options]);
                if (callback) {
                    callback(layer);
                }
            };
        }
    };

    // Expose library via AMD or CommonJS
    if (typeof exports !== 'undefined') {
        module.exports = Datamap;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return Datamap; });
    } else {
        window.Datamap = window.Datamaps = Datamap;
    }

    if (window.jQuery) {
        window.jQuery.fn.datamaps = function (options, callback) {
            options = options || {};
            options.element = this[0];
            var datamap = new Datamap(options);
            if (typeof callback === "function") {
                callback(datamap, options);
            }
            return this;
        };
    }
})();
