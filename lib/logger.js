const colors = require('colors/safe'),
      _ = require('lodash');

module.exports = options => {
    options = _.extend({}, {
      minLevel: 1
    }, options);

	const levelTypes = {
		debug: { level: 1, color: colors.magenta },
		info: { level: 2, color: colors.green },
		warn: { level: 3, color: colors.yellow },
		error: { level: 4, color: colors.red }
	};

	const logger = {};

	Object.keys(levelTypes).forEach(type => {
		logger[type] = (message) => {
			if (levelTypes[type].level >= options.minLevel) {
				console.log(levelTypes[type].color(`${type}: ${message}`));
			}
		};
	});

	return logger;
};