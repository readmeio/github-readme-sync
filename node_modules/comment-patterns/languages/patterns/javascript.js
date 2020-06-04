module.exports = {
  name: 'JavaScript',
  nameMatchers: ['.js'],
  multiLineComment: require('./common/c-style.js').multiLine(),
  singleLineComment: require('./common/c-style.js').singleLine()
}
