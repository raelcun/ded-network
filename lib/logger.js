
const chalk = require('chalk'),
      _ = require('lodash')

module.exports = ({ minLevel = 1, maxLevel = 4 }) => {
	const levelTypes = {
		debug: { level: 1, color: chalk.yellow },
		info: { level: 2, color: chalk.green },
		warn: { level: 3, color: chalk.magenta },
		error: { level: 4, color: chalk.red }
	}

	const logger = {}

	Object.keys(levelTypes).forEach(type => {
		logger[type] = function (message) {
			if (levelTypes[type].level >= minLevel && levelTypes[type].level <= maxLevel) {
			  const args = Array.prototype.slice.call(arguments)
			  args.unshift(type + ':')
			  console.log.apply(console, args.map(e => levelTypes[type].color(e)))
			}
		}
	})

	return logger
}