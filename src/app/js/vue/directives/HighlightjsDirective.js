Vue.directive('highlightjs', {
  deep: true,
  bind: function (el, binding) {
    // on first bind, highlight all targets
    var targets = el.querySelectorAll('code'), target;
    for (var i=0; i < targets.length; i++) {
      target = targets[i];
      if (binding.value) { 
        target.textContent = binding.value
        hljs.highlightBlock(target)
      }
    }
  },
  componentUpdated: function (el, binding) {
    // after an update, re-fill the content and then highlight
    var targets = el.querySelectorAll('code'), target;
    for (var i=0; i < targets.length; i++) {
      target = targets[i];
      if (binding.value) { 
        target.textContent = binding.value
        hljs.highlightBlock(target)
      }
    }
    
  }
})