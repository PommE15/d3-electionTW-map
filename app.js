// var of candidates    
var counties = ["臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","宜蘭縣","新竹縣","新竹市","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","屏東縣","臺東縣","花蓮縣","澎湖縣","金門縣","連江縣"],
    pCount = {},
    colorMap = {},
    vc = getVillageCandidate();

var ul = document.getElementById("candidateList");

function countParty(item) {
  switch (item.party) {
    case "NAP": pCount.NAP++; break;
    case "DPP": pCount.DPP++; break;
    case "KMT": pCount.KMT++; break;
    default:
      pCount.others++; 
      //console.log("party: ", item.party);
  }
}

counties.forEach(function(c) {
  var constant, 
      ratioNAP, 
      rgbColor,
      numCandi = vc[c].qmCandidateList.length;
  // calc candidates' parties on county 
  // refactory: vc.filter(isCountyCountParty(c)).length; 
  pCount = {"NAP":0, "DPP":0, "KMT":0, "others":0}; 
  vc[c].qmCandidateList.forEach(countParty);
  
  // recalc rgb numbers
  constant = 255 / numCandi;
  ratioNAP = Math.round(pCount.NAP * constant);
  rgbColor = {
    r: ratioNAP,
    g: Math.round(pCount.DPP * constant * 1.25) + ratioNAP,
    b: Math.round(pCount.KMT * constant) + ratioNAP
  }
  colorMap[c] = {
    "count": pCount, 
    "color": rgbColor
  };
});


// list candidates 
var link = "http://k.olc.tw/elections/candidates/view/";
function setCandidateList(county) {
  var li, a;
      vn = vc[county].villageNumber,
      cn = vc[county].qmCandidateList.length; 
  document.getElementById("countyName").textContent = county;
  document.getElementById("villageNumber").textContent = vn; 
  document.getElementById("candidateNumber").textContent = cn;
  document.getElementById("ratioNumber").textContent = Math.round((cn/vn) * 10000) / 100; 
  document.getElementById("totalNumber").textContent = vn - cn;
  document.getElementById("NAP").textContent = colorMap[county].count.NAP;
  document.getElementById("DPP").textContent = colorMap[county].count.DPP;
  document.getElementById("KMT").textContent = colorMap[county].count.KMT;
  document.getElementById("otherParty").textContent = colorMap[county].count.others;
  
  vc[county].qmCandidateList.forEach(function(candi) {
    li = document.createElement("li");
    li.textContent = candi.town + " > " + candi.village;
    a = document.createElement("a");
    a.href = link + candi["link-c"];
    a.target = "_blank";
    a.textContent = candi.name;
    switch (candi.party) {
      case "NAP": /* use default bg color */ break;
      case "KMT": a.classList.add("bg-c-blue"); break;
      case "DPP": a.classList.add("bg-c-green"); break;
      default: a.classList.add("bg-c-r"); 
    }
    li.appendChild(a);
    ul.appendChild(li);
  });
}
function onCountyClicked(county) {
  console.log(arcs);
  arcs.remove();
  // remove all child nodes if any exists
  if (ul.hasChildNodes()) { 
    while (ul.firstChild) {
      ul.removeChild(ul.firstChild);
  }}
  setCandidateList(county);
  drawPieChart(county);
}
setCandidateList(counties[0]);



/****** svg ******/
// map
var w = 600,
    h = 700,
    svg = d3.select("svg#map")
            .attr("width", w)
            .attr("height", h),
    json = {
      "county" : "county_topo.json",
      "town"   : "town_topo.json",
      "village": "village_topo.json"
    },
    proj = d3.geo.mercator().center([122, 24.5]).scale(7000),
    path = d3.geo.path().projection(proj);


d3.json(json.county, function(err, map) {
  if (err) { return console.log(error); }

  // draw/color the map on county 
  counties.forEach(function(c) {
    svg.append("path")
    .datum(topojson.merge(map, map.objects.layer1.geometries.filter(function(d) {
      return c === d.properties.COUNTYNAME;
    })))
    .attr("class", "county-v") //debug
    .attr("d", path)
    .style("fill", function() {
      var color = colorMap[c].color;
      this.addEventListener("click", function(){onCountyClicked(c);}, false);
      return "rgb(" + color.r + "," + color.g + "," + color.b + ")";
    })
  });
  /*
     svg.append("path")
     .datum(topojson.feature(map, map.objects.layer1))
     .attr("d", path);             

     svg.selectAll("path")
     .data(topojson.feature(map, map.objects.layer1).features)
     .enter()
     .append("path")
     .attr...   
     */

  // draw text
  var tempCounty = "",
      textCenter = {
        "宜蘭縣": [510,230],
        "花蓮縣": [470,360],
        "基隆市": [500,160],
        "新北市": [450,220],
        "南投縣": [380,335],
        "新竹縣": [420,250],
        "嘉義縣": [260,405],
        "金門縣": [60,245]
      };
  
  svg.selectAll(".county")
  .data(topojson.feature(map, map.objects.layer1).features)
  .enter()
  .append("text")
  .attr("transform", function(d) {
    var county = d.properties.COUNTYNAME,
        center = textCenter[county] || path.centroid(d);
    // to avoid duplicates
    if (tempCounty === county) { return; }
    tempCounty = county; 
    return "translate(" + center + ")"; 
  })
  .attr("dx", "-3.5em")
  .attr("dy", "-.25em")
  .text(function(d) {
    return d.properties.COUNTYNAME;
  });
});
// end of d3.json

// pie chart
var arcs//svgPie;
function drawPieChart(county){
  var wPie = 160,
      hPie = 160,
      outerR = wPie / 2, //radius
      innerR = wPie / 6,
      color = ["rgb(120, 150, 250)", "rgb(130, 240, 40)", "red", "#EEE", "rgb(250, 250, 50)"],
      pie = d3.layout.pie(),
      d = colorMap[county].count,
      total = vc[county].villageNumber - vc[county].qmCandidateList.length,
      dataset = [d.KMT, d.DPP, d.others, d.NAP, total],
      arc,
      //arcs,
      svgPie;
  // draw arc paths
  svgPie = d3.select("svg#pie")
        .attr("width", wPie)
        .attr("height", hPie);
  arc = d3.svg.arc()
        .innerRadius(innerR)
        .outerRadius(outerR);
  arcs = svgPie.selectAll("g.arc")
        .data(pie(dataset))
        .enter()
        .append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + outerR + "," + outerR + ")");
      
  arcs.append("path")
    .attr("d", arc)
    .attr("fill", function(d,i) {
      return color[i];
    });
  // draw texts
  arcs.append("text")
    .attr("transform", function(d) {
      return "translate(" + arc.centroid(d) + ")"; 
    })
    .attr("text-anchor", "middle")
    .text(function(d) {
      return d.value;
    });
    //.style("fill", "white");
}
drawPieChart(counties[0]);
