const util = require('util')
const fs = require('mz/fs'), css = require('css'), cheerio = require('cheerio')

if(process.argv.length < 5) {
  console.error('must provide first the css file path, second the html file path, third css output path')
  return
}

let cssPath = process.argv[2], htmlPath = process.argv[3], outputPath = process.argv[4]

Promise.all([
  fs.readFile(cssPath).then((data) => {
    return css.parse(data.toString())
  }),
  fs.readFile(htmlPath).then((data) => {
    return cheerio.load(data)
  })
]).then(([ast, $]) => {
  //console.log(util.inspect(ast, {depth: null, breakLength: 100}))

  function process(rule) {
    if(!rule.selectors) {
      console.log(rule)
      return true
    }

    let selectors = []
    for(let selector of rule.selectors) {
      if(selector[0] === '@') {
        //console.log(selector)
        selectors.push(selector)
        continue
      }

      let stripped = selector.replace(/::?[a-zA-Z0-9\-]+(\(.*?\))?/g, '').trim()
      //console.log(`selector: ${selector}\nstripped: ${stripped}`)
      if(stripped && !$(stripped).length) continue
      selectors.push(selector)
    }
    if(selectors.length) {
      rule.selectors = selectors
      return true
    }
    return false
  }

  let stylesheetRules = []
  for(let rule of ast.stylesheet.rules) {
    if(rule.type !== 'rule') { //i.e. rule.type === 'media'
      if(!rule.rules) { //i.e. rule.type === 'import' || rule.type === 'keyframes'
        stylesheetRules.push(rule)
        continue
      }

      let subrules = []
      for(let subrule of rule.rules) if(process(subrule)) subrules.push(subrule)
      if(subrules.length) {
        rule.rules = subrules
        stylesheetRules.push(rule)
      }
    } else {
      if(process(rule)) stylesheetRules.push(rule)
    }
  }
  ast.stylesheet.rules = stylesheetRules

  return css.stringify(ast)

}).then((data) => {
  return fs.writeFile(outputPath, data)
}).catch((error) => {
  console.error(error)
})
