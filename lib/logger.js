const chalk = require('chalk'),
      _ = require('lodash');

module.exports = options => {
    options = _.extend({}, {
      minLevel: 1,
      maxLevel: 4
    }, options);

	const levelTypes = {
		debug: { level: 1, color: chalk.magenta },
		info: { level: 2, color: chalk.green },
		warn: { level: 3, color: chalk.yellow },
		error: { level: 4, color: chalk.red }
	};

	const logger = {};

	Object.keys(levelTypes).forEach(type => {
		logger[type] = function (message) {
			if (levelTypes[type].level >= options.minLevel && levelTypes[type].level <= options.maxLevel) {
			  const args = Array.prototype.slice.call(arguments);
			  args.unshift(type + ':');
			  //console.log.apply(console, args)
			  console.log.apply(console, args.map(e => levelTypes[type].color(e)))
			}
		};
	});

	return logger;
};