let modal = {};
let months = ['Jan','Feb','Mar','Apr','May','Jun',
              'Jul','Aug','Sept','Oct','Nov','Dec'];

modal.element = document.getElementById('modal');
modal.content = document.querySelector('.modal-card');
modal.header = document.querySelector('.title');
modal.title = document.querySelector('.name');
modal.description = document.querySelector('.description');
modal.tech = document.querySelector('.tech');
modal.links = document.querySelector('.links');
modal.time = document.querySelector('.time');

modal.close = function () {

  if (state.value === state.MODAL) {
    console.log('Closing modal');
    modal.element.classList.remove('modal-show');
    state.value = state.MODAL_CLOSING;
  }

};

modal.open = function (node) {
  modal.setItem(node);
  modal.element.classList.add('modal-show');
};

modal.setItem = function (node) {

  // console.log(node);
  this.element.style.backgroundColor = data.colours[node.category];

  // configure
  this.title.innerHTML = node.name;
  this.description.innerHTML = node.description;
  this.header.style.backgroundImage = 
    'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.6) 100%), url("' + node.img + '")';

  if (node.name != 'Jerry Yuan Chen') {

    this.time.innerHTML = months[node.month] + ' ' + node.year;
    this.tech.innerHTML = node.technologies.join(', ');
    modal.renderLinks(node, this.links);

    this.tech.classList.remove('hidden');
    this.links.classList.remove('hidden');

  } else {

    this.time.innerHTML = '';
    this.tech.innerHTML = '';
    this.tech.classList.add('hidden');
    this.links.classList.add('hidden');
    
  }
};

modal.renderLinks = function (node) {
  this.links.innerHTML='';

  for (var link of node.links) {
    let el = document.createElement('a');
    el.innerHTML = link.source;
    el.href = link.link;
    this.links.appendChild(el);
    el.target = '_blank';
    el.style.backgroundColor = data.colours[node.category];
  }
};