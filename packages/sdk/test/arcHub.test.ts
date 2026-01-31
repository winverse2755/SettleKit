import { ArcLiquidityHub } from '../src/routers/ArcHub';

async function test() {
    const hub = new ArcLiquidityHub();

    const plan = await hub.routeViaArc('base', 'polygon', '100');

    console.log('Execution Plan:\n', plan);
}

test();
