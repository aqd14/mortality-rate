/*
-----------------------------------------------------------
*/

var disease_list = ['Total', 'Pneumonia','Diarrhoea','Malaria','Aids','Measles','Injury','Meningitis','Other'];
// d3.select(window).on("resize", throttle);

var topo,projection,path,svg;

var color;
var curYear = 2000; // Default current year

var no_data_available_color = "#999999";


// Number of legend, range
var sub_range = 5
// Default disease index
var disease_index = 0;
// Default value for color disease (Total rate)
var disease_color = d3.schemeReds[sub_range];

var max_value;
var min_value;

var zoom = d3.zoom()
    //.extent([1,9])
    .scaleExtent([1, 9])
    .on("zoom", move);

var c = document.getElementById('chart');
var width = 900;
var height = 850;

setup(width,height);

function setup(width,height){
  //projection = d3.geo.mercator()
  projection = d3.geoMercator()
    .translate([(width/2), (height/2)])
    .scale( width / 2 / Math.PI);

  //path = d3.geo.path().projection(projection);
  path = d3.geoPath().projection(projection);

  svg = d3.select("#chart").append("svg")
      //.attr("id", 'world')
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      //.on("click", click)
      .append("g");

  g = svg.append("g")
         .on("click", click);

}

// var scale = colorbrewer.YlOrRd[9].reverse().concat(colorbrewer.YlGn[9]);
// The color scale

// The SVG container
/*var width  = 960;
var height = 550;*/

// The network of lines of latitude and longitude upon which a map is drawn
var graticule = d3.geoGraticule();

// Tooltip
//offsets for tooltips
var offsetL = c.offsetLeft + 20;
var offsetT = c.offsetTop + 10;
var tooltip = d3.select("#chart")
                .append("div")
                .attr("class", "tooltip hidden");
                //.attr("hidden", "true");

var data = {};

d3.csv("data/mortality-2000.csv", function(row) {
	// Convert data from string to number
	row.forEach(function(d, i) {
		var diseases = [];
    var total = 0;
		for (var index = 1; index < disease_list.length; index ++) {
			diseases.push(+d[disease_list[index]]);
      total = total + parseFloat(d[disease_list[index]]);
		};
    diseases.unshift(total.toFixed(1));
		data[d.CountryName] = diseases;
		return;
	});
 });

// The map
d3.json("topojson/world-topo-min.json", function(error, world) {
	var countries = topojson.feature(world, world.objects.countries).features;
	topo = countries;
	drawMap(topo);
});

function drawMap() {
/*	svg.append("path")
	   	.datum(graticule)
		  .attr("class", "graticule")
		  .attr("d", path);*/
  initMapParams()

	g.append("path")
	 .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
	 .attr("class", "equator")
	 .attr("d", path);


  var country = g.selectAll(".country").data(topo);
  country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d,i) { return d.id; })
      .attr("title", function(d,i) { return d.properties.name; })
      .style("fill", function(d,i) { 
      	if (data[d.properties.name] !== undefined) {
      		return color(data[d.properties.name][disease_index])
      	}
      	return no_data_available_color;
      })
      .on("mouseover", function(d,i) { handleMouseOver(d); })
      .on("mouseout", handleMouseOut);
}

// Initialize parameters needed to draw map at first time
function initMapParams() {
  // Get min/max values
  updateValues();
  // Get default color
  color = getDiseaseColor();
  // Create legend with default color
  updateLegendColor(disease_list[disease_index]);
}

// Highlight country when user selects
function handleMouseClick(){

}


/*
	Display mortality rate when user hovers mouse over each country
*/
function handleMouseOver(country) {
        // ** Show/hide tooltip
   
    var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );
    // Check mortality rate for each country
    // Assign 'undefine' if not available
    var mortality_rate = 'undefined'
    if (data[country.properties.name] !== undefined) {
      mortality_rate = data[country.properties.name][disease_index];
    }
 	  tooltip.classed("hidden", false)
			.attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
			.html('<b>'+country.properties.name+'</b>'+' <span class="sep"> - </span> '+ mortality_rate);
}

function handleMouseOut() {
	tooltip.classed("hidden", true)
}


function redraw() {
  width = c.offsetWidth;
  height = width / 2;
  d3.select('svg').remove();
  setup(width,height);
  drawMap(topo);
}


function move() {
  var t = [d3.event.transform.x,d3.event.transform.y];
  var s = d3.event.transform.k;
  zscale = s;
  var h = height/4;

  t[0] = Math.min(
    (width/height)  * (s - 1), 
    Math.max( width * (1 - s), t[0] )
  );

  t[1] = Math.min(
    h * (s - 1) + h * s, 
    Math.max(height  * (1 - s) - h * s, t[1])
  );

  //zoom.translateBy(t);
  g.attr("transform", "translate(" + t + ")scale(" + s + ")");

  //adjust the country hover stroke width based on zoom level
//    d3.selectAll(".country").style("stroke-width", 1.5 / s);

}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
    }, 200);
}


//geo translation on mouse click in map
function click() {
  var latlon = projection.invert(d3.mouse(this));
  console.log(latlon);
}

// Handle event click on total rate
$("#Total").click(function(d, i) {
  console.log("Click on total!");
  if ($(this).index !== 0) {
    disease_index = 0; // Get index of "Total rate"
    update();
  }
});

// Handle event click on separate disease
$( "#separate-disease .selection" ).click(function(d, i) {
  console.log( 'Click on disease' + $(this).index());
  if (disease_index !== ($(this).index() + 1)) {
    disease_index = $(this).index() + 1;
  //  var diseases = disease_list[disease_index];
    update();
  }
});

/* Update map color based on the disease's rate */
function update() {

  // Get data from selected year
  curYear = +d3.select("#year").node().value;
//  data = getDataCurrentYear(curYear);
  switch(disease_index) {
    case 0: // Total rate
      disease_color = d3.schemeReds[sub_range];
      break;
    case 1: // Pneumonia
      disease_color = d3.schemeGreens[sub_range];
      break;
    case 2: // Diarrhoea
      disease_color = d3.schemeGreys[sub_range];
      break;
    case 3: // Malaria
      disease_color = d3.schemeOranges[sub_range];
      break;
    case 4: // Aids
      disease_color = d3.schemePurples[sub_range];
      break;
    case 5: // Measles
      disease_color = d3.schemeBlues[sub_range];
      break;
    case 6: // Injury
      disease_color = d3.schemeBuGn[sub_range];
      break;
    case 7: // Meningitis
      disease_color = d3.schemeBuPu[sub_range];
      break;
    case 8: // Other
      disease_color = d3.schemeGnBu[sub_range]
      break;
    default:
      disease_color = d3.schemeReds[sub_range];
      break;
  }

  color = getDiseaseColor();
  // Update choropleth map
  updateMap();
  // Update legends
  updateLegendColor(disease_list[disease_index]);
  // Update max/min value
  updateValues();
//  d3.select("#yearLabel").text(2000);
}

// Update maximum and minimum number of rate
function updateValues() {
  values = d3.values(data).map(function(d) { return d[disease_index]; })
  max_value = +d3.max(values);
  min_value = +d3.min(values);
  // console.log('Max value: ' + max_value);
  // console.log('Min value: ' + min_value);
}

// Return data corressponding with selected year
function getDataCurrentYear(curYear) {
  data = {};
  return data;
}

function getDiseaseColor() {
  var diff = (max_value - min_value)/sub_range;
  color_domain = [];
  for (var sub_range_index = 0; sub_range_index < sub_range; sub_range_index ++) {
    value = parseFloat(min_value + diff*sub_range_index).toFixed(1);
    color_domain.push(value);
  }
  // [min_value, min_value + diff/4, min_value + diff/3, min_value + diff/2, max_value];
  // Round elements
/*  for (var i = 0; i < color_domain.length; i++) {
    color_domain[i] = parseFloat(color_domain[i]).toFixed(1);
  } */
  var color = d3.scaleQuantile()
    .domain(color_domain)
    .range(disease_color);
  return color;
}

/* Update the color and data in wolrd map */
function updateMap() {
/*  console.log("Call updateMap function!");
  console.log("Disease index: " + disease_index);
  console.log("Color: " + color.range());*/
  d3.selectAll('.country').style("fill", function(d, i) {
      if (data[d.properties.name] !== undefined) {
        return color(data[d.properties.name][disease_index]);
      }
      return no_data_available_color;
    });
}

/* Create chorolepath threshold */
function updateLegendColor(disease_name) {
  console.log("In function createLegendColor!");
  d3.selectAll(".swatch").style("background", function(d, i) {
    console.log("Color: " + disease_color[i]);
    return disease_color[i];
  });
}
