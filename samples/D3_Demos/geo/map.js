function Map() {
    var _map = {};
    var _container;
    var _svg, _controlBar, _tooltip;
    var _w, _h;
    var _nameField = '', _labelField;
    var _subunits;
    var _zoom;
    var _scaleExtent;
    var _initialTranslate;
    var _fillLinear;

    _map.nameField = function (field) {
        if (arguments.length == 0) {
            return _nameField;
        }
        _nameField = field;
        return _map;
    };

    _map.labelField = function (field) {
        if (arguments.length == 0) {
            return _labelField;
        }
        _labelField = field;
        return _map;
    };

    _map.container = function (container) {
        if (arguments.length == 0) {
            return _container;
        }
        _container = d3.select(container);
        return _map;
    };

    _map.width = function (w) {
        if (arguments.length == 0) {
            return _w;
        }
        _w = w;
        return _map;
    };

    _map.height = function (h) {
        if (arguments.length == 0) {
            return _h;
        }
        _h = h;
        return _map;
    };

    _map.draw = function (data) {
        if (!_svg) {
            _svg = _container.append('svg');
            initControlBar();
            initTooltip();
        }
        _svg.html('');
        _svg.attr('width', _w).attr('height', _h);

        drawMap(data);
    };

    _map.fillData = function (data) {
        var max = d3.max(data, function (d) { return d.value; });
        _fillLinear = d3.scaleLinear().domain([0, max]).range(['#aaaaaa', '#444444']);
        _subunits.selectAll('path.subunit').each(function (d, index, nodes) {
            this.fillData = 0;
            for (var i = 0; i < data.length; i++) {
                if (d.properties[_nameField] == data[i].key) {
                    this.fillData = data[i].value;
                    break;
                }
            }
            fillSubUnit(this);
        });
    };

    function fillSubUnit(subUnit) {
        if (subUnit.isMouseOver) {
            d3.select(subUnit).style('fill', '#ff9900');
        } else {
            if (subUnit.fillData == 0) {
                d3.select(subUnit).style('fill', '#ffffff');
            } else {
                d3.select(subUnit).style('fill', _fillLinear(subUnit.fillData));
            }
        }
    }

    function initControlBar() {
        _controlBar = _container.append('div').attr('class', 'control-bar');
        _controlBar.append('img').attr('class', 'zoom-in').attr('src', 'images/map-zoomin.png');
        _controlBar.append('img').attr('class', 'zoom-out').attr('src', 'images/map-zoomout.png');
        _controlBar.append('img').attr('class', 'center').attr('src', 'images/map-center.png');
        _controlBar.selectAll('img').on('click', function () {
            var img = d3.select(this);
            if (img.attr('class') == 'zoom-in') {
                _zoom.scaleBy(_subunits, 1.1);
            } else if (img.attr('class') == 'zoom-out') {
                _zoom.scaleBy(_subunits, .9);
            } else {
                _zoom.transform(_subunits, d3.zoomIdentity);
                _zoom.translateBy(_subunits, _initialTranslate.x, _initialTranslate.y);
                _zoom.scaleTo(_subunits, _scaleExtent[0]);
            }
        });
    }

    function initTooltip() {
        _tooltip = _container.append('div').attr('class', 'tooltip');
        _tooltip.style('visibility', 'hidden');
    }

    function drawMap(data) {
        var projection = d3.geoEquirectangular();
        var path = d3.geoPath().projection(projection);
        _subunits = _svg.append('g').attr('class', 'subunits');
        var geoData = data.features;
        _subunits.selectAll('path.subunit')
            .data(geoData)
            .enter()
            .append('path')
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('class', function (d) {
                return 'subunit ' + d.properties[_nameField];
            })
            .attr('d', path)
            .style('fill', '#FFF')
            .style('stroke', '#999')
            .on('mouseover', function () {
                this.isMouseOver = true;
                fillSubUnit(this);
            })
            .on('mouseout', function () {
                this.isMouseOver = false;
                fillSubUnit(this);
            })
            .on('mousemove', function (d) {
                _tooltip.html(d.properties[_labelField] + ': ' + this.fillData);

                var pos = d3.mouse(_container.node());
                var x = pos[0] + 10;
                var y = pos[1] + 10;
                x = Math.min(_w - _tooltip.node(0).clientWidth - 2, x);
                if (y + _tooltip.node(0).clientHeight > _h) {
                    y = pos[1] - 10 - _tooltip.node(0).clientHeight;
                }
                _tooltip.style('left', x + 'px');
                _tooltip.style('top', y + 'px');
                _tooltip.style('visibility', 'visible');

                d3.event.stopPropagation();
                d3.select(document.body).on('mousemove', function () {
                    d3.select(document.body).on('mousemove', null);
                    _tooltip.style('visibility', 'hidden');
                });
            });
        transformMap();
    }

    function transformMap() {
        var centerRect = _subunits.node().getBoundingClientRect();
        var containerRect = _container.node().getBoundingClientRect();

        _initialTranslate = {};
        _initialTranslate.x = - ((centerRect.left + centerRect.width / 2) - (containerRect.left + containerRect.width / 2));
        _initialTranslate.y = - ((centerRect.top + centerRect.height / 2) - (containerRect.top + containerRect.height / 2));

        var scale = Math.min(_w / centerRect.width, _h / centerRect.height);
        if (scale > 1) {
            scale = Math.floor(scale);
        }
        _subunits.insert('rect', 'path').attr('width', _w).attr('height', _h).attr('fill', '#eef');

        _zoom = d3.zoom().on("zoom", zoomed);
        _zoom.translateBy(_subunits, _initialTranslate.x, _initialTranslate.y);
        _zoom.scaleTo(_subunits, scale);
        _scaleExtent = [scale, scale * 2];
        _zoom.scaleExtent(_scaleExtent);
        _subunits.call(_zoom);
    }

    function zoomed() {
        _subunits.selectAll('path.subunit').attr("transform", d3.event.transform.toString());
    }

    return _map;
}