/* The D3 Force Layout for Desktop */

// d3 setup
let desktop;
let svg;
let simulation;
let width, height;
let forces = {
  collide: null,
  center: null,
  manyBody: null,
  x: null,
  y: null
};

let data = {
  nodes: [],
  colours: [],
  sizes: [],
};

let svgs = {
  circles: null,
  borders: null,
  imgPatterns: null,
  imgs: null
};

const config = {
  HOVER_RAD_CHANGE: 10,
  SPAWN_RANGE: 2000,
  NODE_MARGIN: 4,
  LABEL_Y_OFFSET: -10,
  IMG_BORDER: 5, 
  IMG_BORDER_FOCUS: 10,
  RAD_GROWTH_RATE: 1,
  MOBILE_MAX_WIDTH: 766
};

// modal data
let hovernode, tooltip;

/* Initialize or restart d3 instance */
const redraw = function () {

  d3.selectAll('svg > *').remove();
  simulation = d3.forceSimulation();

  // Sizing svg
  width = desktop.clientWidth;
  height = desktop.clientHeight;
  console.log('Redrawing: ' + width + ' x ' + height);
  svg.attr('width', width).attr('height', height);

  resetForces();

  // Initializing
  simulation
    .nodes(data.nodes)
    .force('manyBody', forces.manyBody)
    .force('center', forces.center)
    .force('x', forces.x)
    .force('y', forces.y)
    .force('collide', forces.collide)
    .velocityDecay(0.6)
    .on('tick', ticked);

  svg.append('svg:defs')
    .selectAll('img-patterns')
    .data(data.nodes)
    .enter().append('pattern')
    .attr('class', 'img-patterns')
    .attr('id', n => n.name.split(' ').join('-'))
    .attr('patternContentUnits', 'objectBoundingBox')
      .append('image')
      .attr('xlink:href', n => n.img);

  let node = svg.selectAll('.node')
    .data(data.nodes)
    .enter().append('g')
    .attr('class', 'node');

  node.append('circle')
    .attr('class', 'border-circle')
    .style('fill', n => data.colours[n.category]);

  node.append('circle')
    .attr('class', 'img-circle')
    .style('fill', n => 'url(#' + n.name.split(' ').join('-') + ')');

  svgs.borders = node.selectAll('.border-circle');
  svgs.imgs = svg.selectAll('image');
  svgs.imgPatterns = svg.selectAll('.img-patterns');
  svgs.circles = node.selectAll('.img-circle');

  /* MOUSE EVENTS */
  node.on('mouseenter', (n, i) => { // select element in current context

    n.r = n.rDefault + config.HOVER_RAD_CHANGE; 
    hovernode = n;
    // svg.style('background-color', data.colours[n.category]);
    refreshSimulationNodes();

  }).on('mouseleave', (n, i) => { // set back

    n.r = n.rDefault;
    hovernode = null;
    // svg.style('background-color', '#fff');
    refreshSimulationNodes();

  }).on('click', (n, i) => { modal.openModal(n); });

};

/* SVG RENDER FRAME */
const ticked = function () {

  svgs.borders
    .attr('r', n => n.r)
    .attr('cx', n => n.x)
    .attr('cy', n => n.y);

  svgs.circles
    .attr('r', n => n.r - (n === hovernode ? config.IMG_BORDER_FOCUS : config.IMG_BORDER))
    .attr('cx', n => n.x)
    .attr('cy', n => n.y);

  svgs.imgs
    .attr('width', '1')
    .attr('height', '1')
    .attr('preserveAspectRatio', "xMidYMid slice");

  svgs.imgPatterns
    .attr('viewbox', '0 0 1 1')
    .attr('preserveAspectRatio', "xMidYMid slice")
    .attr('width', n => '100%')
    .attr('height', n => '100%');

};

/*  */
const resetForces = function () {

  let fheight = height*0.9;

  forces.collide = d3.forceCollide()
    .radius(n => n.r + config.NODE_MARGIN)
    .iterations(40)
    .strength(0.9);

  forces.center = d3.forceCenter([width/2, fheight/2])
    .x(width/2)
    .y(fheight/2);

  forces.manyBody = d3.forceManyBody()
    .strength(1000);

  forces.x = d3.forceX(width/2).strength(0.1);
  forces.y = d3.forceY(fheight/2).strength(0.1);

}

/* Update simulation with new dataset */
const refreshSimulationNodes = function () {

  simulation.stop();
  simulation.nodes(data.nodes);
  simulation.alpha(1);
  simulation.restart();

};

/* Load Data */
d3.json('dist/data/nodedata.json', (error, resdata) => {

  if (error) throw error;

  data.nodes = resdata.nodes;
  data.colours = resdata.colours;
  data.sizes = resdata.sizes;

  desktop = document.getElementById('desktop');
  svg = d3.select(desktop).append('svg');

  width = desktop.clientWidth;
  height = desktop.clientHeight;

  // Set initial position and size
  data.nodes.map((n) => {

    n.r = data.sizes[n.category];
    n.rDefault = data.sizes[n.category];
    n.x = (Math.random()*config.SPAWN_RANGE - config.SPAWN_RANGE/2) + width/2;
    n.y = (Math.random()*config.SPAWN_RANGE - config.SPAWN_RANGE/2) + height/2;
    return n;

  });

  redraw();

  window.addEventListener('resize', () => {

    if (desktop.clientWidth > config.MOBILE_MAX_WIDTH) { redraw(); }
    else simulation.stop();
    
  });

});
