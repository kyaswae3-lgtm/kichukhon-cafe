# REST API
Base URL: `/api`. JSON request/response. Protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create customer |
| POST | `/auth/login` | Public | Login |
| GET | `/auth/me` | User | Current account |
| PATCH | `/users/me` | User | Update profile |
| GET | `/foods?q=&category=&featured=` | Public | Browse/search foods |
| GET | `/foods/:id` | Public | Food details |
| GET | `/categories` | Public | Categories |
| GET | `/cart` | User | Current cart |
| POST | `/cart/items` | User | Add food |
| PATCH/DELETE | `/cart/items/:id` | User | Update/remove item |
| GET/POST | `/addresses` | User | List/create address |
| POST | `/coupons/validate` | User | Validate discount |
| POST | `/orders` | User | Place order |
| GET | `/orders/mine` | User | Order history |
| GET | `/orders/:id` | Owner/Admin | Order detail |
| POST | `/payments/:orderId/initialize` | User | Disabled until official gateway verification is configured |
| POST | `/reviews` | User | Submit review |
| GET | `/foods/:id/reviews` | Public | Food reviews |
| GET/POST/DELETE | `/favorites` and `/favorites/:foodId` | User | Favorites |
| GET | `/admin/overview` | Admin | Dashboard metrics |
| GET | `/admin/orders` | Admin | All orders |
| PATCH | `/admin/orders/:id/status` | Admin | Update workflow status |
| GET | `/admin/customers` | Admin | Customer list |
| POST/PATCH/DELETE | `/admin/foods` | Admin | Food management |
| POST | `/admin/categories` | Admin | Create category |
| POST | `/admin/coupons` | Admin | Create coupon |

Order status: Pending → Confirmed → Preparing → Ready for Pickup → Out for Delivery → Delivered; Cancelled is an alternate terminal state.
Payment status is separate from delivery status.
