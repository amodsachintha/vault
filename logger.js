const { createLogger, format, transports } = require('winston');

const getLogger = (service = 'vault') => {
    return createLogger({
        level: 'debug',
        defaultMeta: { service: service },
        format: format.combine(
            format.colorize({all:true}),
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.printf(info => `${info.timestamp} ${info.service}: [${info.level}] ${info.message}`)
        ),
        transports: [new transports.Console()],
    });
};

module.exports = {getLogger};

