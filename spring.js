function SpringSolver(mass, stiffness, damping, initialVelocity) {
    let m_w0 = Math.sqrt(stiffness / mass);
    let m_zeta = damping / (2 * Math.sqrt(stiffness * mass));
    let m_wd, m_A, m_B;
    if (m_zeta < 1) {
        // Under-damped.
        m_wd = m_w0 * Math.sqrt(1 - m_zeta * m_zeta);
        m_A = 1;
        m_B = (m_zeta * m_w0 + -initialVelocity) / m_wd;
    } else {
        // Critically damped (ignoring over-damped case for now).
        m_wd = 0;
        m_A = 1;
        m_B = -initialVelocity + m_w0;
    }

    return (t) => {
        if (m_zeta < 1) {
            // Under-damped
            t = Math.exp(-t * m_zeta * m_w0) * (m_A * Math.cos(m_wd * t) + m_B * Math.sin(m_wd * t));
        } else {
            // Critically damped (ignoring over-damped case for now).
            t = (m_A + m_B * t) * Math.exp(-t * m_w0);
        }

        // Map range from [1..0] to [0..1].
        return 1 - t;
    };
}

const start = function(params) {
    const {startTime, solver, fraction, from, to, maxPeriod, values: valuesP, finite, index} = params;
    let values = valuesP;
    const elapsed = Date.now() / 1000 - startTime;
    const proportion = solver(elapsed);

    let current = from + (to - from) * proportion;

    if (fraction) {
        current = Math.round(current * 10 ** fraction) / 10 ** fraction;
    }
    //ограничение в периоде колебаний
    if (finite < maxPeriod) {
        try {
            values = {
                ...values,
                ...start({
                    ...params,
                    finite: current === to ? finite + 1 : finite,
                    index: index + 1,
                    values: {
                        ...values,
                        [index]: current,
                    },
                }),
            };
        } catch (e) {
            return values;
        }
    } else {
        return values;
    }
    return values;
};

const formatName = ({name, subName, value, postfix = ''}) => {
    return `${name ? name + ':' : ''} ${subName ? `${subName}(${value}${postfix})` : `${value}${postfix}`}`;
};
const spring = (params = {}) => {
    let pr = {
        current: params.from,
        from: params.from,
        to: params.to,
        mass: params.mass || 1,
        stiffness: params.stiffness || 100,
        damping: params.damping || 10,
        maxPeriod: params.maxPeriod || 2,
        fraction: params.fraction || 3,
        initialVelocity: params.initialVelocity || 0,
        finite: 0,
        index: 0,
        values: {},
    };
    pr.startTime = Date.now() / 1000;
    pr.solver = SpringSolver(pr.mass, pr.stiffness, pr.damping, pr.initialVelocity);

    return start(pr);
};

const getMainFrame = (params, values, onlyValue) => {
    const stepsKeys = Object.keys(values);
    const step = Math.round(stepsKeys.length / 100);

    return (i) => onlyValue ? values[i * step] : formatName({...params, value: values[i * step]});
};
const springs = (animations, params = {}) => {
    let fromFrame, toFrame, mainFrame;
    let animation = params;

    if (Array.isArray(animations)) {
        const values = animations.map((param) => spring({...params, ...param}));

        fromFrame = animations.map((param) => {
            let animation = {...param, ...params};

            return params.name ? animation.from : formatName({
                ...animation,
                value: animation.from,
            });
        }).join(params.name ? ',' : ';');

        toFrame = animations.map((param) => {
            let animation = {...param, ...params};
            return params.name ? animation.to : formatName({
                ...animation,
                value: animation.to,
            });
        }).join(params.name ? ',' : ';');

        const valuesFrame = (i) => values.map((value, key) =>
            getMainFrame({...params, ...animations[key]}, value, !!params.name)(i))
            .join(params.name ? ',' : ';');

        mainFrame = valuesFrame;

        if (params.name) {
            fromFrame = formatName({...params, value: fromFrame});
            toFrame = formatName({...params, value: toFrame});
            mainFrame = (i) => formatName({...params, value: valuesFrame(i)});
        }
    } else {
        animation = {...params, ...animations};
        const values = spring(animation);
        fromFrame = formatName({...animation, value: animation.from});
        toFrame = formatName({...animation, value: animation.to});
        mainFrame = getMainFrame(animation, values);
    }
    let keyframes = `{\n from {\n${fromFrame}\n}\n`;
    for (let i = 1; i < 100; i++) {
        keyframes = i % animation.fraction === 0 ? keyframes +
            `${i}% {\n${mainFrame(i)}\n}\n` : keyframes;
    }
    return keyframes + `to {\n${toFrame}\n}\n}`;
};

console.log(
    springs([{
        stiffness: 381.47,
        damping: 15.17,
    }, {
        stiffness: 381.47,
        damping: 20.17,
    }], {
        from: 1.085,
        to: 1,
        name: 'transform',
        subName: 'scale',
        maxPeriod: 3,
        fraction: 5,
    }),
);
