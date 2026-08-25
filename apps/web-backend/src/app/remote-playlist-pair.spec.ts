import { createWebBackendApp } from './web-backend-app';
import { withServer } from './web-backend-app.spec-helpers';

describe('remote playlist pair routes', () => {
    it('waits until a playlist is posted for the device id', async () => {
        await withServer(createWebBackendApp(), async (baseUrl) => {
            const waiting = await fetch(`${baseUrl}/pair/AB-12-CD`);
            await expect(waiting.json()).resolves.toEqual({
                status: 'esperando',
            });

            const posted = await fetch(`${baseUrl}/api/pair/ab12cd`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    m3uUrl: 'https://example.com/list.m3u',
                    listName: 'Casa',
                }),
            });
            const body = (await posted.json()) as { status: string; m3uUrl: string };
            expect(posted.status).toBe(200);
            expect(body.status).toBe('listo');
            expect(body.m3uUrl).toBe('https://example.com/list.m3u');

            const ready = await fetch(`${baseUrl}/pair/AB-12-CD`);
            await expect(ready.json()).resolves.toMatchObject({
                status: 'listo',
                m3uUrl: 'https://example.com/list.m3u',
                listName: 'Casa',
            });
        });
    });

    it('rejects empty payloads', async () => {
        await withServer(createWebBackendApp(), async (baseUrl) => {
            const response = await fetch(`${baseUrl}/pair/AB-12-CD`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ listName: 'Empty' }),
            });
            expect(response.status).toBe(400);
        });
    });
});
