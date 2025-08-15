// src/components/Embed.js
import { getEmbedSDK} from '@looker/embed-sdk'

export function renderEmbed(parentElement, type, id) {
    parentElement.innerHTML = '';

    const embedContainer = document.createElement('div');
    embedContainer.id = 'embed-container';
    parentElement.appendChild(embedContainer);

    const sdk = getEmbedSDK().init()
    let builder
    if (type === 'dashboard') {
      builder = sdk.createDashboardWithId(id)
    } else if (type === 'explore') {
      builder = sdk.createExploreWithId(id)
    } else if (type === 'look') {
      builder = sdk.createLookWithId(id)
    }

    builder.appendTo('#embed-container')

    if (type === 'dashboard') {
      builder
        .on('dashboard:loaded', () => console.log('Dashboard loaded'))
        .on('dashboard:run:start', () => console.log('Dashboard run start'))
        .on('dashboard:run:complete', () => console.log('Dashboard run complete'))
    } else if (type === 'explore') {
      builder
        .on('explore:ready', () => console.log('Explore ready'))
        .on('explore:run:start', () => console.log('Explore run start'))
        .on('explore:run:complete', () => console.log('Explore run complete'))
    } else if (type === 'look') {
      builder
        .on('look:ready', () => console.log('Look ready'))
        .on('look:run:start', () => console.log('Look run start'))
        .on('look:run:complete', () => console.log('Look run complete'))
    }

    builder.build().connect().then(console.log).catch(console.error)
}
