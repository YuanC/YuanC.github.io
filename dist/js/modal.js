'use strict';var modal={},months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];modal.element=document.getElementById('modal'),modal.picture=document.querySelector('.picture'),modal.title=document.querySelector('.name'),modal.description=document.querySelector('.description'),modal.tech=document.querySelector('.tech'),modal.links=document.querySelector('.links'),modal.time=document.querySelector('.time'),modal.button_close=document.getElementById('modalCloseButton'),modal.close=function(){state.value===state.MODAL&&(console.log('Closing modal'),modal.element.classList.remove('modal-show'),state.value=state.MODAL_CLOSING,simulation.restart())},modal.open=function(a){modal.setItem(a),modal.element.classList.add('modal-show')},modal.setItem=function(a){this.element.style.backgroundColor=data.colours[a.category].primary,this.element.style.color=data.colours[a.category].secondary,this.element.style.borderColor=data.colours[a.category].secondary,this.title.innerHTML=a.name,this.description.innerHTML=a.description,this.picture.sr=a.img,this.picture.style.backgroundImage='url("'+a.img+'")',this.button_close.style.color=data.colours[a.category].secondary,this.button_close.style.borderColor=data.colours[a.category].secondary,'Jerry Yuan Chen'==a.name?(this.time.innerHTML=months[a.month]+' '+a.year,this.tech.innerHTML=a.technologies.join(', '),this.links.innerHTML='',modal.renderLinks(a,this.links),this.tech.classList.add('hidden')):(this.time.innerHTML=months[a.month]+' '+a.year,this.tech.innerHTML=a.technologies.join(', '),modal.renderLinks(a,this.links),this.tech.classList.remove('hidden'))},modal.renderLinks=function(a){this.links.innerHTML='';var b=!0,c=!1,d=void 0;try{for(var e,f=a.links[Symbol.iterator]();!(b=(e=f.next()).done);b=!0){var g=e.value,h=document.createElement('a');h.innerHTML=g.source,h.href=g.link,this.links.appendChild(h),h.target='_blank',h.style.color=data.colours[a.category].secondary,h.style.borderColor=data.colours[a.category].secondary+'38'}}catch(a){c=!0,d=a}finally{try{!b&&f.return&&f.return()}finally{if(c)throw d}}};