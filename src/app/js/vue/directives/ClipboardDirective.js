Vue.directive('clipboard', {
  deep: true,
  bind: function (el, binding) {
    // on first bind, highlight all targets
    // 
    
    new Clipboard(el);




    // var targets = el.querySelectorAll('code')
    // targets.forEach((target) => {
    //   // if a value is directly assigned to the directive, use this
    //   // instead of the element content.
    //   if (binding.value) {
    //     target.textContent = binding.value
    //   }
    //   hljs.highlightBlock(target)
    // })
    
  },
  componentUpdated: function (el, binding) {
    // after an update, re-fill the content and then highlight
    // var targets = el.querySelectorAll('code')
    // targets.forEach((target) => {
    //   if (binding.value) {
    //     target.textContent = binding.value
    //     hljs.highlightBlock(target)
    //   }
    // })
  }
})