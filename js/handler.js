/*
-----------------------------------------------------------
*/

// Flag to check what kind of map user selects
var selectedMap = {
    type: ""
};

var REGULAR_MAP = "Regular Map";
var SURPRISE_MAP = "Surprise Map";

// Mortality rate domain
var rate_domain = [];
var max_value;
var min_value;

var zoom = d3.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);

var c = document.getElementById('chart');
var width = 900;
var height = 850;

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


// Milestone
var curYear = 2000; // Default current year
var boom_year = 2000;
var bust_year = 2015;

// Data variables
var data = {};
var surpriseData = {};
var uniform = {};
var boom = {};
var bust = {};

var disease_list = ['Total', 'HIV','Diarrhoeal','Malaria','Measles','Injuries'];

var projection, path, svg;
var selected_country;

// Number of legend, range
var sub_range = 5
// Default disease index
var disease_index = 0;

// --------- Color variable ------------//
var no_data_available_color = "#f4e542";
var color;
// Default value for color disease (Total rate)
var disease_color = d3.schemeReds[sub_range];
// Surprise color range
var surprise;

setup(width,height);

function setup(width,height){
  projection = d3.geoMercator()
    .translate([(width/2), (height/2)])
    .scale( width / 2 / Math.PI);

  path = d3.geoPath().projection(projection);

  svg = d3.select("#chart").append("svg")
      .attr("id", "topo-world-map")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");

  g = svg.append("g")
         .on("click", click);
}

function readData(fileName, data) {
  console.log('Read data ...');
  d3.csv(fileName, function(row) {
  // Convert data from string to number
  row.forEach(function(d, i) {
    var diseases = [];
    var total = 0;
    for (var index = 1; index < disease_list.length; index ++) {
      diseases.push(+d[disease_list[index]]);
      total = total + parseFloat(d[disease_list[index]]);
    };
    diseases.unshift(parseFloat(total.toFixed(1)));
    data[d.Country] = diseases;
    return;
  })
 });
}

agg_data = [];
for (var year = boom_year; year <= bust_year; year ++) {
  var data = {};
  readData("data/mortality-" + year.toString() + ".csv", data);
  agg_data.push(data);
}

// readData("data/mortality-2000.csv", data_2000);
// readData("data/mortality-2015.csv", data_2015);

// The map
d3.json("topojson/world-topo-min.json", function(error, world) {
	var countries = topojson.feature(world, world.objects.countries).features;
	topo = countries;
	drawMap(topo);
});

function drawMap() {
  console.log('Drawing map...');
  initMapParams()

	// g.append("path")
	//  .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
	//  .attr("class", "equator")
	//  .attr("d", path);

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
      .on("mouseout", handleMouseOut)
      .on("click", function(d) { 
        selected_country = d.properties.name;
        handleMouseClick();
      });
}

// Initialize parameters needed to draw map at first time
function initMapParams() {
  console.log('Init Map Params...');
  // First look at top of the page
  $(window).scrollTop($(".world-map").offset().top);
  // Hide surprise legends
  $('#surprise-legends').hide();
  // Init type of map
  selectedMap.type = REGULAR_MAP;
  // Default dataset
  data = agg_data[curYear%2000];
  // Calculate surprise
  calSurprise();
  // Get min/max values
  updateBoundaryValues();
  // Get default color
  color = getDiseaseColor();
  // Create legend with default color
  updateLegend(disease_list[disease_index]);
}

// Highlight country when user selects
function handleMouseClick(){  
  // Update country name on top of chart
  d3.select(".tab-view").select("h3").text(selected_country);
  // Make bar chart
  makeSupportChart();
  // Scroll down to the detail charts
  $(window).scrollTop($(".indicator-container").offset().top);
}


/*
	Display mortality rate when user hovers mouse over each country
*/
function handleMouseOver(country) {
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

// Hide tooltip
function handleMouseOut() {
	tooltip.classed("hidden", true)
}

// Redraw map when zoom in, zoom out
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


// -------------------- Event Handler ------------------------ //
// Handle event click on total rate
$("#Total").click(function(d, i) {
  if ($(this).index !== 0) {
    disease_index = 0; // Get index of "Total rate"
    drawRegularMap();
  }
});

// Handle event click on separate disease
$( "#separate-disease .selection" ).click(function() {
  if (disease_index !== ($(this).index() + 1)) {
    disease_index = $(this).index() + 1;
    drawRegularMap();
  }
});

// Chart index:
// 0 : Bar chart
// 1 : Line chart
// 2 : Pie chart
var chart_index = 0;
// Handle event select type of chart
$(".nav-tabs li").click(function(d) {
  if (chart_index !== $(this).index()) {
    // Update tab item status
    $(this).siblings().removeClass("active");
    $(this).addClass("active");
    // Update chart index
    chart_index = $(this).index();
    // Make supporting chart based on type selected
    makeSupportChart();
  }
});

$('#map-type-selected').change(function() {
  var selected_map = this.value;
  switch(selected_map) {
    case 'regular-map':
      $('#surprise-legends').hide();
      $('.legend-container').show();
      selectedMap.type = REGULAR_MAP;
      drawRegularMap();
      break;
    case 'surprise-map':
      // Hide legend container
      $('.legend-container').hide();
      $('#surprise-legends').show();

      selectedMap.type = SURPRISE_MAP;
      // Test
      // calAverageRate();
      drawSurpriseMap();
      break;
  }
});
// ------------------------- End Event Handler ------------------------- //

// Make support chart based on chart index
// Maintain chart index for each selection
function makeSupportChart() {
  switch(chart_index) {
    case 0: 
      makeBarChart();
      break;
    case 1:
      makeLineChart();
      break;
    case 2: 
      makePieChart();
    default:
      makeBarChart();
      break;
  }
}

/* Update map color based on the disease's rate */
function update() {
  curYear = +d3.select("#year").node().value;
  // Set label
  d3.select("#yearLabel").text(curYear);
  switch(selectedMap.type) {
    case REGULAR_MAP:
      drawRegularMap();
      break;
    case SURPRISE_MAP:
      drawSurpriseMap();
      break;
    default:
      console.log("Error: " + selectedMap.type);
      break;
  }
}

// Update screen for surprise map:
// 1. Change to surprise color range
// 2. Remove some elements from regular map
function drawSurpriseMap() {
  index = curYear%2000;
  var values = d3.values(surpriseData).map(function(d) { 
    return d[index]; 
  })
  var max_value = +d3.max(values);
  var min_value = +d3.min(values);
  // Update domain based on data of current year
  surprise = d3.scaleQuantile()
              .domain([min_value,max_value])
              .range(colorbrewer.RdBu[11].reverse());

/*  var svg = d3.select("#chart ");
  if (svg.empty()) {
    svg = d3.select(".indicator-container").append("svg").attr("width", "600").attr("height", "350");
  } else {
    // Remove all children to redraw
    svg.selectAll("*").remove();
  }
  // Draw surprise legends
  var svg = d3.select('#chart')
                .append("g")
                .attr("width", "200")
                .attr("height", "200");
  var legend = g.selectAll("rect")
  .data(surprise.range())
  .enter();
  
  legend.append("rect")
  .attr("stroke","#fff")
  .attr("fill",function(d){ return d;})
  .attr("y",35)
  .attr("x",function(d,i){ return 300/2 - (45) + 10*i; })
  .attr("width",10)
  .attr("height",10);*/

  console.log('Drawing surprise map!');
  d3.select("#topo-world-map")
    .selectAll("path")
    .style("fill",function(d){ 
    // console.log("Surprise: ");  
 //   console.log(d);
    if (surpriseData[d.properties.name] !== undefined) {
      // console.log(surpriseData[d.properties.name][0]);
      // console.log(surprise(surpriseData[d.properties.name][0]));
      return surprise(surpriseData[d.properties.name][index]);
    }
    return no_data_available_color;
  });
}

// Update screen for regular map:
// 1. Make choropleth map for child mortality rate
// 2. Remove surprise map's elements
function drawRegularMap() {
  data = getDataCurrentYear(curYear);

  switch(disease_index) {
    case 0: // Total rate
      disease_color = d3.schemeReds[sub_range];
      break;
    case 1: // HIV/AIDS
      disease_color = d3.schemeGreens[sub_range];
      break;
    case 2: // Diarrhoea
      disease_color = d3.schemeGreys[sub_range];
      break;
    case 3: // Malaria
      disease_color = d3.schemeOranges[sub_range];
      break;
    case 4: // Measles
      disease_color = d3.schemePurples[sub_range];
      break;
    case 5: // Injury
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

  // Update max/min value
  updateBoundaryValues();
  // Get main color
  color = getDiseaseColor();
  // Update choropleth map
  updateMap();
  // Update legends
  updateLegend(disease_list[disease_index]);
}

// Extract maximum and minimum number of mortility rate
function updateBoundaryValues() {
  var values = d3.values(data).map(function(d) { return d[disease_index]; })
//  console.log(values);
  max_value = +d3.max(values);
  min_value = +d3.min(values);
}

// Return data corressponding with selected year
function getDataCurrentYear() {
  return agg_data[curYear%2000];
}

function getDiseaseColor() {
  var diff = (max_value - min_value)/sub_range;
  rate_domain = [];
  // Range has 5 values => domain should have 6 intervals
  for (var sub_range_index = 0; sub_range_index <= sub_range; sub_range_index ++) {
    value = parseFloat(min_value + diff*sub_range_index).toFixed(1);
    rate_domain.push(value);
  }
  var color = d3.scaleQuantile()
                .domain(rate_domain)
                .range(disease_color);
  return color;
}

/* Update the color and data in wolrd map */
function updateMap() {
  d3.selectAll('.country').style("fill", function(d, i) {
      if (data[d.properties.name] !== undefined) {
        return color(data[d.properties.name][disease_index]);
      }
      return no_data_available_color;
    });
}

/* Create chorolepath threshold */
function updateLegend(disease_name) {
  // Update color
  d3.selectAll(".swatch").style("background", function(d, i) {
    return disease_color[i];
  });
  // Update text
  d3.select(".map-legends").selectAll(".range").text(function(d, i) {
      return rate_domain[i].toString() + " - " + rate_domain[i + 1].toString();
  });
  // Update title
  d3.select("#legends").select(".legend-title").text(disease_list[disease_index]);
}

// Extract mortality rate for selected country
// To ease the process of projecting data
function extractRate() {
  // Build up data
  var country_data = [];
  for (var i = 1; i < disease_list.length; i ++) {
    // country_data[disease_list[i]] = data[selected_country][i];
    var obj = {
      "disease": disease_list[i],
      "rate": data[selected_country][i]  
    }
    country_data.push(obj);
  }
  return country_data;
}


// Create bar chart for selected country
function makeBarChart() {
  // Extract country data
  var country_data = extractRate(selected_country);
  // Start drawing chart
  var svg = d3.select(".indicator-container svg");
  if (svg.empty()) {
    svg = d3.select(".indicator-container").append("svg").attr("width", "600").attr("height", "350");
  } else {
    // Remove all children to redraw
    svg.selectAll("*").remove();
  }

  //var container = d3.select(".indicator-container");
  var margin = {top: 20, right: 20, bottom: 30, left: 40},
              width = parseInt(svg.attr("width")) - margin.left - margin.right,
              height = parseInt(svg.attr("height")) - margin.top - margin.bottom;

  var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
      y = d3.scaleLinear().rangeRound([height, 0]);

  x.domain(country_data.map(function(d) { return d.disease; }));
  y.domain([0, d3.max(country_data, function(d) { return d.rate; })]);

  // Add bar label
  svg.selectAll("text")
  .data(country_data)
  .enter()
  .append("text")
  .text(function(d) { return d.rate; })
  .attr("x", function(d, i) {
            return i * (width / country_data.length) + 90;
         })
   .attr("y", function(d) {
      if (d.rate > 0) {// Only display rate > 0
        return y(d.rate) + 15;//h - (d * 4) + 15;
      }
   })
  .attr("text-anchor", "middle")
  .attr("font-family", "sans-serif")
  .attr("font-size", "10px")
  .attr("fill", "black")

  // Make bars
  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(10))
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Rate");

  g.selectAll(".bar")
    .data(country_data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.disease); })
      .attr("y", function(d) { return y(d.rate); })
      .attr("width", x.bandwidth())
      .attr("height", function(d) { return height - y(d.rate); });
}

// Make line chart to compare mortality rate between selected country 
// and average rate in whole world
function makeLineChart() {

}

// Make pie chart to check the portion of each disease
function makePieChart() {

}

// ------------- Process Surprise Map ---------------------//

  
// Calculate mortality average rate for current year
function calAverageRate(i) {
  var numberOfCountry = 0;
  var sum = d3.sum(d3.values(agg_data[i]).map(function(d) { 
    numberOfCountry++;
    return d[disease_index]; 
  }));
  sum = sum.toFixed(1);
  var averageRate = (sum/numberOfCountry).toFixed(1);
  return averageRate;
}

// Calculate the total of mortality for the current year
function calSumRate(i) {
  var sum = d3.sum(d3.values(agg_data[i]).map(function(d) {
    return d[disease_index];
  }));
  return sum.toFixed(1);
}

// Calculate surprise data for each disease
function calSurprise() {
  for(var country in data) {
    surpriseData[country] = [];
    for (var index = 0; index < agg_data.length; index ++) {
      surpriseData[country][index] = 0;
    }
  }

  // Start with equiprobably P(M)s
  // For each year:
  // Calculate observed-expected
  // Estimate P(D|M)
  // Estimate P(M|D)
  // Surprise is D_KL ( P(M|D) || P(M) )
  // Normalize so sum P(M)s = 1
  
  //0 = uniform, 1 = boom, 2 = bust
  
  //Initially, everything is equiprobable.
  var pMs =[(1/3),(1/3),(1/3)];

  // uniform.surprise = [];
  // boom.surprise = [];
  // bust.surprise = [];
  
  // uniform.pM = [pMs[0]];
  // boom.pM = [pMs[1]];
  // bust.pM = [pMs[2]];

  var pDMs = [];
  var pMDs = [];
  var avg;
  var total;
  //Bayesian surprise is the KL divergence from prior to posterior
  var kl;
  var diffs = [0,0,0];
  var sumDiffs = [0,0,0];

  // Data in 2000
  var boom_year_data = agg_data[boom_year%2000];
  // Data in 2015
  var bust_year_data = agg_data[bust_year%2000];

  for(var i = 0; i < agg_data.length; i++){
    sumDiffs = [0,0,0];
    avg = calAverageRate(i);
    total = calSumRate(i);

    var cur_data = agg_data[i];
    for(var country in cur_data){
      //Estimate P(D|M) as 1 - |O - E|
      //uniform
      diffs[0] = ((cur_data[country][0]/total) - (avg/total));
      pDMs[0] = 1 - Math.abs(diffs[0]);
      //boom
      diffs[1] = ((cur_data[country][0]/total) - (boom_year_data[country][0]/total));
      pDMs[1] = 1 - Math.abs(diffs[1]);
      //bust
      diffs[2] = ((cur_data[country][0]/total) - (bust_year_data[country][0]/total));
      pDMs[2] = 1 - Math.abs(diffs[2]);
      
      //Estimate P(M|D)
      //uniform
      pMDs[0] = pMs[0]*pDMs[0];
      pMDs[1] = pMs[1]*pDMs[1];
      pMDs[2] = pMs[2]*pDMs[2];
      
      
      // Surprise is the sum of KL divergance across model space
      // Each model also gets a weighted "vote" on what the sign should be
      kl = 0;
      var voteSum = 0;
      for(var j=0;j<pMDs.length;j++){
        kl+= pMDs[j] * (Math.log( pMDs[j] / pMs[0])/Math.log(2));
        voteSum += diffs[j]*pMs[j];
        sumDiffs[j]+=Math.abs(diffs[j]);
      }
      
      surpriseData[country][i] = voteSum >= 0 ? Math.abs(kl) : -1*Math.abs(kl);
    }
    
    //Now lets globally update our model belief.
    
    for(var j = 0;j<pMs.length;j++){
      pDMs[j] = 1 - 0.5*sumDiffs[j];
      pMDs[j] = pMs[j]*pDMs[j];
      pMs[j] = pMDs[j];
    }
    
    //Normalize
    var sum = pMs.reduce(function(a, b) { return a + b; }, 0);
    for(var j = 0;j<pMs.length;j++){
      pMs[j]/=sum;
    }
    
    // uniform.pM.push(pMs[0]);
    // boom.pM.push(pMs[1]);
    // bust.pM.push(pMs[2]);
    
  }
}
