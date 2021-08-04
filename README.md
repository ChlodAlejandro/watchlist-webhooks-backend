# Watchlist Webhooks (backend)
This is the backend for the [watchlist-webhooks](https://watchlist-webhooks.toolforge.org) tool on [Toolforge](https://toolforge.org). The tool is run and developed by [Chlod](https://en.wikipedia.org/wiki/User:Chlod) on the English Wikipedia.

The goal of Watchlist Webhooks is to send watchlist updates live from Wikimedia [EventStreams](https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams) onto user-defined endpoints. This is in contrast to the polling-based method that both RSS and normal watchlist checking rely on - which doesn't provide updates in a timely manner, and also relies on continuous interaction with the Wikipedia website. Additionally, [Special:Watchlist](https://en.wikipedia.org/wiki/Special:Watchlist) is unable to track multiple changes to the same page &mdash; this calls assigned webhook for each diff to a watchlist.

## Contributing
You may find the `setup.sql` file in `src/database` useful for setting up a test database. Configuration information is not yet available, but can be inferred.

## License
Apache License 2.0.