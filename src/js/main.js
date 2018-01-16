// Node Layout Implementation

let desktop, svg, simulation, width, height, config, hovernode, animation_id,
  mouse = { down: false, pos: [0,0] },
  data = { nodes: {}, colours: {}, sizes: {} },
  svgs = { circles: null, imgPatterns: null, imgs: null, transition: {},
    tooltip: {} },
  forces = { collide: null, center: null, manyBody: null, x: null, y: null },
  state = { value: 0, VIEW: 0, MODAL: 1, MODAL_OPENING: 2, MODAL_CLOSING: 3 };

// Load data
function init () {
  d3.json('dist/data/nodedata.json', (error, resdata) => {

    if (error) throw error;

    data.nodes = resdata.nodes;
    data.colours = resdata.colours;
    data.sizes = resdata.sizes;
    config = resdata.config;

    desktop = document.getElementById('desktop');
    svg = d3.select(desktop).append('svg');

    width = desktop.clientWidth;
    height = desktop.clientHeight;

    // Set initial position and size
    data.nodes.map((n) => {

      n.r = data.sizes[n.size];
      n.rDefault = data.sizes[n.size];
      n.x = (Math.random()*config.SPAWN_RANGE - config.SPAWN_RANGE/2) + width/2;
      n.y = (Math.random()*config.SPAWN_RANGE - config.SPAWN_RANGE/2) + height/2;
      return n;

    });

    redraw();

    window.addEventListener('resize', () => {

      if (desktop.clientWidth > config.MOBILE_MAX_WIDTH) {
        window.cancelAnimationFrame(animation_id);
        redraw();
      }
      
    });

  });
}

/* Initialize/restart instance */
function redraw () {

  d3.selectAll('svg > *').remove();
  simulation = d3.forceSimulation();
  simulation.stop();

  // Sizing svg
  width = desktop.clientWidth;
  height = desktop.clientHeight;
  console.log('Redrawing: ' + width + ' x ' + height);
  svg.attr('width', width).attr('height', height);

  resetForces();
  state.value = state.VIEW;

  // Initializing simulation
  simulation
    .nodes(data.nodes)
    .force('manyBody', forces.manyBody)
    .force('center', forces.center)
    .force('x', forces.x)
    .force('y', forces.y)
    .force('collide', forces.collide)
    .velocityDecay(0.6);

  animation_id = window.requestAnimationFrame(renderFrame);

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
    .style('fill', n => data.colours[n.category]['primary']);

  node.append('circle')
    .attr('class', 'img-circle')
    .style('fill', n => 'url(#' + n.name.split(' ').join('-') + ')');

  svg.append('circle').attr('id', 'transition-circle');
  // svg.append('rect').attr('id', 'tooltip');

  svgs.borders = node.selectAll('.border-circle');
  svgs.imgs = svg.selectAll('image');
  svgs.imgPatterns = svg.selectAll('.img-patterns');
  svgs.circles = node.selectAll('.img-circle');
  svgs.transition.el = svg.select('#transition-circle');
  // svgs.tooltip.el = svg.select('#tooltip');

  /* MOUSE EVENTS */
  node.on('mouseenter', (n, i) => {

    n.r = n.rDefault + config.HOVER_RAD_CHANGE; 
    hovernode = n;
    updateSimulationNodes();

  }).on('mouseleave', (n, i) => { // set back

    n.r = n.rDefault;
    hovernode = null;
    updateSimulationNodes();

  }).on('click', (n, i) => { 
    if (state.value === state.VIEW) {
      
      svgs.transition.node = n;
      svgs.transition.r_current = n.r;
      svgs.transition.r_target = getTransitionCircleRadiusTarget(n.x, n.y, width, height)
      
      svgs.transition.el
        .style('fill', data.colours[n.category]['primary'])
        .attr('cx', n.x)
        .attr('cy', n.y)
        .attr('r', svgs.transition.r_current);
      
      state.value = state.MODAL_OPENING;

    }
  })
    // TODO add drag and drop functionality
    .on('mousedown', (n, i) => { /* FOLLOW MOUSE */ })
    .on('mouseup', (n, i) => { /* RELEASE */ });
};

/* Frame */
function renderFrame () {

  simulation.tick();
  // console.log('tick');
  
  switch (state.value) {
    case state.MODAL_OPENING:
      svgs.transition.r_current += svgs.transition.r_target/config.TRANSITION_DURATION/60.0;
      svgs.transition.el.attr('r', svgs.transition.r_current);

      if (svgs.transition.r_current > svgs.transition.r_target) {
        modal.open(svgs.transition.node);
        state.value = state.MODAL;
      }
      break;

    case state.MODAL_CLOSING:
      svgs.transition.r_current -= svgs.transition.r_target/config.TRANSITION_DURATION/60.0;
      svgs.transition.el.attr('r', Math.max(svgs.transition.r_current, 0));

      if (svgs.transition.r_current < svgs.transition.node.r) {
        svgs.transition.el.attr('r', 0);
        state.value = state.VIEW;
      }
      break;

    default:
      svgs.borders
        .attr('r', n => n.r)
        .attr('cx', n => n.x)
        .attr('cy', n => n.y);
      svgs.circles
        .attr('r',
          n => {
            if (n === hovernode) return n.r - config.IMG_BORDER_FOCUS
            else return n.r - config.IMG_BORDER
          })
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
      // TODO svgs.tooltip.

      // if (hovernode) {
      //   hovernode.x = 
      // }
  }

  animation_id =  window.requestAnimationFrame(renderFrame);

};

/* When data changes */
function resetForces () {

  let fheight = height*1.0;

  forces.collide = d3.forceCollide()
    .radius(n => n.r + config.NODE_MARGIN)
    .iterations(40)
    .strength(config.FORCE_COLLIDE_STR);

  forces.manyBody = d3.forceManyBody().strength(config.FORCE_MANYBODY_STR);

  forces.x = d3.forceX(width/2).strength(config.FORCE_XY_STR);
  forces.y = d3.forceY(fheight/2).strength(config.FORCE_XY_STR);

}

/* Update simulation with new dataset */
function updateSimulationNodes () {
  simulation.nodes(data.nodes);
  simulation.alpha(1);
};

function getTransitionCircleRadiusTarget (x, y, w, h) {
  let points = [[0, 0], [0, h], [w, 0], [w, h]]
  let max = 0;

  points.forEach(p => {
    max = Math.max(
      Math.sqrt( Math.pow(p[0] - x, 2) + Math.pow(p[1] - y, 2) ),
      max
    );
  });

  return max;
}