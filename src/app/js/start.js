//window.splm = SharePointListManager;

var routes = [
  { path: '/', redirect : '/start', 'name' : 'sok'},
  
  { path: '/start', name : 'start', component: StartTabComponent },
  { path: '/start/other', name : 'start-other', component: StartTabComponent },
  { path: '/start/about', name : 'start-about', component: StartTabComponent },
  { path: '/get-started', name : 'get-started', component: GetStartedTabComponent },
  { path: '/examples', name : 'examples', component: ExamplesTabComponent },
  { path: '/examples/find/:query', component: ExamplesTabComponent },
  { path: '/examples/find/:query/:id', name : 'example-search-item', component: VisaAvtalComponent },
  { path: '/examples/:id', name : 'show-example', component: VisaAvtalComponent },
  { path: '/live', name : 'live', component: LiveTabComponent },
  { path: '/live/:hash', name : 'live-hash', component: LiveTabComponent },
] 


  
// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
var router = new VueRouter({
  routes : routes,
  base : '/start/'
})

var app = new Vue({
	el : '#camljs-app',
	router : router,
	data : {
		test : "hej4"
	}
});
     
     ;(function () {
  function domReady (f) { /in/.test(document.readyState) ? setTimeout(domReady,16,f) : f() }

  function resize (event) {
    event.target.style.height = 'auto';
    event.target.style.height = (event.target.scrollHeight + 16)+'px';
  }
  /* 0-timeout to get the already changed text */
  function delayedResize (event) {
    window.setTimeout(resize, 0, event);
  }

  domReady(function () {
    var textareas = document.querySelectorAll('textarea[auto-resize]')

    for (var i = 0, l = textareas.length; i < l; ++i) {
      var el = textareas.item(i)

      el.addEventListener('change',  resize, false);
      el.addEventListener('cut',     delayedResize, false);
      el.addEventListener('paste',   delayedResize, false);
      el.addEventListener('drop',    delayedResize, false);
      el.addEventListener('keydown', delayedResize, false);
    }
  })
}());