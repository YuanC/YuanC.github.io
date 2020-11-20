let modal = {};
let months = ['Jan','Feb','Mar','Apr','May','Jun',
              'Jul','Aug','Sept','Oct','Nov','Dec'];

modal.element = document.getElementById('modal');
modal.picture = document.querySelector('.picture');
modal.title = document.querySelector('.name');
modal.description = document.querySelector('.description');
modal.tech = document.querySelector('.tech');
modal.links = document.querySelector('.links');
modal.time = document.querySelector('.time');
modal.button_close = document.getElementById('modalCloseButton');

modal.close = () => {
  if (state.value === state.MODAL) {
    console.log('Closing modal');
    modal.element.classList.remove('modal-show');
    state.value = state.MODAL_CLOSING;
    simulation.restart();
  }
};

modal.open = function (node) {
  modal.setItem(node);
  modal.element.classList.add('modal-show');
};

modal.setItem = function (node) {
  this.element.style.backgroundColor = data.colours[node.category]['primary'];
  this.element.style.color = data.colours[node.category]['secondary'];
  this.element.style.borderColor = data.colours[node.category]['secondary'];

  // configure
  this.title.innerHTML = node.name;
  this.description.innerHTML = node.description;

  this.picture.sr = node.img;
  this.picture.style.backgroundImage = 'url("' + node.img + '")';

  this.button_close.style.color = data.colours[node.category]['secondary'];
  this.button_close.style.borderColor = data.colours[node.category]['secondary'];

  if (node.name != 'Jerry Yuan Chen') {
    this.time.innerHTML = months[node.month] + ' ' + node.year;
    this.tech.innerHTML = node.technologies.join(', ');
    modal.renderLinks(node, this.links);
    this.tech.classList.remove('hidden');
  } else {
    this.time.innerHTML = months[node.month] + ' ' + node.year;
    this.tech.innerHTML = node.technologies.join(', ');
    this.links.innerHTML = '';
    modal.renderLinks(node, this.links);
    this.tech.classList.add('hidden');
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
    el.style.color = data.colours[node.category]['secondary'];
  }
};
