'use strict';var desktop,svg,simulation,width,height,config,hovernode,modal,mouse={down:!1,pos:[0,0]},data={nodes:{},colours:{},sizes:{}},svgs={circles:null,imgPatterns:null,imgs:null,transition:{},tooltip:{}},forces={collide:null,center:null,manyBody:null,x:null,y:null},state={value:0,VIEW:0,MODAL:1,MODAL_OPENING:2,MODAL_CLOSING:3};function init(){d3.json('dist/data/nodedata.json',function(a,b){if(a)throw a;data.nodes=b.nodes,data.colours=b.colours,data.sizes=b.sizes,config=b.config,desktop=document.getElementById('desktop'),svg=d3.select(desktop).append('svg'),width=desktop.clientWidth,height=desktop.clientHeight,data.nodes.map(function(a){return a.r=data.sizes[a.category],a.rDefault=data.sizes[a.category],a.x=Math.random()*config.SPAWN_RANGE-config.SPAWN_RANGE/2+width/2,a.y=Math.random()*config.SPAWN_RANGE-config.SPAWN_RANGE/2+height/2,a}),redraw(),window.addEventListener('resize',function(){desktop.clientWidth>config.MOBILE_MAX_WIDTH?redraw():simulation.stop()})})}function redraw(){d3.selectAll('svg > *').remove(),simulation=d3.forceSimulation(),width=desktop.clientWidth,height=desktop.clientHeight,console.log('Redrawing: '+width+' x '+height),svg.attr('width',width).attr('height',height),resetForces(),state.value=state.VIEW,simulation.nodes(data.nodes).force('manyBody',forces.manyBody).force('center',forces.center).force('x',forces.x).force('y',forces.y).force('collide',forces.collide).velocityDecay(0.6).on('tick',ticked),svg.append('svg:defs').selectAll('img-patterns').data(data.nodes).enter().append('pattern').attr('class','img-patterns').attr('id',function(a){return a.name.split(' ').join('-')}).attr('patternContentUnits','objectBoundingBox').append('image').attr('xlink:href',function(a){return a.img});var a=svg.selectAll('.node').data(data.nodes).enter().append('g').attr('class','node');a.append('circle').attr('class','border-circle').style('fill',function(a){return data.colours[a.category].primary}),a.append('circle').attr('class','img-circle').style('fill',function(a){return'url(#'+a.name.split(' ').join('-')+')'}),svg.append('circle').attr('id','transition-circle'),svgs.borders=a.selectAll('.border-circle'),svgs.imgs=svg.selectAll('image'),svgs.imgPatterns=svg.selectAll('.img-patterns'),svgs.circles=a.selectAll('.img-circle'),svgs.transition.el=svg.select('#transition-circle'),a.on('mouseenter',function(a){a.r=a.rDefault+config.HOVER_RAD_CHANGE,hovernode=a,updateSimulationNodes()}).on('mouseleave',function(a){a.r=a.rDefault,hovernode=null,updateSimulationNodes()}).on('click',function(a){state.value===state.VIEW&&(svgs.transition.node=a,svgs.transition.r_current=a.r,svgs.transition.r_target=getTransitionCircleRadiusTarget(a.x,a.y,width,height),svgs.transition.el.style('fill',data.colours[a.category].primary).attr('cx',a.x).attr('cy',a.y).attr('r',svgs.transition.r_current),state.value=state.MODAL_OPENING)}).on('mousedown',function(){}).on('mouseup',function(){})}function ticked(){switch(console.log('tick'),state.value){case state.MODAL_OPENING:svgs.transition.r_current+=svgs.transition.r_target/config.TRANSITION_DURATION/60,svgs.transition.el.attr('r',svgs.transition.r_current),svgs.transition.r_current>svgs.transition.r_target&&(modal.open(svgs.transition.node),state.value=state.MODAL);break;case state.MODAL_CLOSING:svgs.transition.r_current-=svgs.transition.r_target/config.TRANSITION_DURATION/60,svgs.transition.el.attr('r',Math.max(svgs.transition.r_current,0)),svgs.transition.r_current<svgs.transition.node.r&&(svgs.transition.el.attr('r',0),state.value=state.VIEW);break;default:svgs.borders.attr('r',function(a){return a.r}).attr('cx',function(a){return a.x}).attr('cy',function(a){return a.y}),svgs.circles.attr('r',function(a){return a===hovernode?a.r-config.IMG_BORDER_FOCUS:a.r-config.IMG_BORDER}).attr('cx',function(a){return a.x}).attr('cy',function(a){return a.y}),svgs.imgs.attr('width','1').attr('height','1').attr('preserveAspectRatio','xMidYMid slice'),svgs.imgPatterns.attr('viewbox','0 0 1 1').attr('preserveAspectRatio','xMidYMid slice').attr('width',function(){return'100%'}).attr('height',function(){return'100%'});}}function resetForces(){var a=1*height;forces.collide=d3.forceCollide().radius(function(a){return a.r+config.NODE_MARGIN}).iterations(40).strength(config.FORCE_COLLIDE_STR),forces.manyBody=d3.forceManyBody().strength(config.FORCE_MANYBODY_STR),forces.x=d3.forceX(width/2).strength(config.FORCE_XY_STR),forces.y=d3.forceY(a/2).strength(config.FORCE_XY_STR)}function updateSimulationNodes(){simulation.stop(),simulation.nodes(data.nodes),simulation.alpha(1),simulation.restart()}function getTransitionCircleRadiusTarget(a,b,c,d){var e=0;return[[0,0],[0,d],[c,0],[c,d]].forEach(function(c){var d=Math.pow;e=Math.max(Math.sqrt(d(c[0]-a,2)+d(c[1]-b,2)),e)}),e}