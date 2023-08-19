import path from 'path';
import { tests } from '@iobroker/testing';

// Run tests
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests: ({ suite }) => {
        suite('Test sendTo()', getHarness => {
            it('Should answer to browse', async () => {
                // Create a fresh harness instance each test!
                const harness = getHarness();
                // Start the adapter and wait until it has started
                await harness.startAdapterAndWait();
                return new Promise<void>(resolve => {
                    harness.sendTo('denon.0', 'browse', 'message', (resp: unknown) => {
                        console.dir(resp);
                        resolve();
                    });
                });
            }).timeout(6_000);
        });
    }
});
