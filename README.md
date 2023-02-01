# Premium

A BBS core UI plugin to handle premium content.

## Medusa

The premium operator operates a [Medusa](https://github.com/medusajs/medusa) server with [Medusa Extender](https://github.com/adrien2p/medusa-extender) and [Medusa Marketplace Plugin](https://github.com/shahednasser/medusa-marketplace). This allows the premium operator to run an independent store front (we can build our own, but Medusa offers several FLOSS options, like [nexjs-starter](https://github.com/medusajs/nextjs-starter-medusa)) with any chosen payment system (e.g. Stripe with the [medusa-payment-stripe](https://github.com/medusajs/medusa/tree/master/packages/medusa-payment-stripe) module). All this goodness is probably best stuffed into a docker image and deployed on Cloud Run.

### Medusa BBS Integration

Hopefully, we will need a very small adaptation to the above code in order to work with BBS, but we still don't know what will be the permission scheme. In the optimal scenario, the core operator will handle permissions, and pass the premium operator a signed JWT which will be respected by Medusa.

## BBS Core UI Integration

For this we will pretty much do what we did for [Videbate](https://github.com/deweb-io/videbate). In fact, we will merge Videbate into this repo, in a killer merge of *unrelated histories*! Doesn't that sound exhilarating?
