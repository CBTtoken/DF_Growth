# PARTNER OUTREACH: BOB GO, PAYSTACK, BOB PAY

**Three emails, ready to send. 3 August 2026.**

Same ask in all three, phrased for each. Deliberately short: a first email that asks one clear thing gets answered, and a long one gets forwarded to somebody who never replies.

**What we actually want from each:**

1. An official route for onboarding our members onto their platform
2. Their best practice for a third party connecting a merchant's own account
3. Whether there is a partner or referral programme we should be on
4. Whether anything we are doing is unusual enough to be worth their input

**What we are not asking for:** money, a discount, or anything that routes their merchant's funds through us. Saying that plainly early is what makes the rest credible.

---

## 1. BOB GO

**To:** their partnerships or integrations contact
**Subject:** API integration and member onboarding, DigitalFlyer SA

Good day,

I run DigitalFlyer SA. We build and host web pages and online shops for small South African businesses, mostly sole operators selling low-value items, and we currently have members live and selling.

We have already integrated Bob Go. A member connects their own Bob Go account from our dashboard, we hold their key encrypted, and their buyers see live rates for their own delivery address at checkout. Shipments are booked on the member's own account, in their name, so the parcel, the claim and the liability stay with the person who packed it. We never sit in the middle of a shipment.

Three things I would value your view on.

**Onboarding.** Most of our members do not have a Bob Go account yet. What is the cleanest way for us to send them to you and get them trading? Is there a partner or referral route we should be on, rather than us writing our own instructions and guessing?

**Connecting an account.** We currently ask a member to paste an API key. Is there an authorisation flow you would prefer we use, so a member approves a connection rather than copying a token by hand? Related: do those tokens expire, and if so what is the renewal path? Silent expiry is the failure I most want to design around, because it stops rates quoting at a stranger's checkout hours after the member last looked at their dashboard.

**Webhooks.** Can a webhook be registered on a member's account pointing at an endpoint of ours, routed on account id, so we can update tracking status on their orders?

One thing I could not resolve from your interface: the API channel carries a crown icon suggesting a paid tier. I understand that limitation was lifted for our own account. Does it apply to members connecting their own accounts through us? I would rather tell them the truth up front than have them hit a paywall halfway through.

Happy to talk to someone technical. We have full API integration capability in-house, so if there is a better way to do any of this than the way we have done it, I would rather hear it now.

Kind regards,
Dewald Rosema
DigitalFlyer SA

---

## 2. PAYSTACK

**To:** their support or partnerships address
**Subject:** Onboarding small merchants and connecting their own accounts

Good day,

I run DigitalFlyer SA. We build web pages and online shops for small South African businesses, and we have members live and taking orders today.

We use Paystack ourselves for our own subscription billing. Separately, our members sell their own products through the shops we host, and we have built that so a member connects **their own** Paystack account and their customers' money settles directly to them. We are software only. No split, no subaccount, and no member's customer payment ever passes through a DigitalFlyer account. That is a hard rule for us rather than a current limitation.

What I would value from you.

**Onboarding.** Most of our members have no gateway at all. What is the cleanest path for us to send a sole proprietor to you and get them approved? Anything we can do on our side to make those applications land well and get through quickly would help both of us.

**Connecting an account.** Today we take a member's secret key and store it encrypted. That works, but a key pasted into a third party is not what I would choose if you offer something better. Is there an OAuth or authorisation flow you would prefer an integrator to use for connecting a merchant's own account?

**Partner programme.** Is there one we should be on? We are onboarding new small merchants regularly and would rather do it inside whatever structure you already have.

**Anything we are doing wrong.** We have full API integration capability in-house. If there is a better pattern than what I have described, I would genuinely rather be told now than find out from a support ticket later.

Kind regards,
Dewald Rosema
DigitalFlyer SA

---

## 3. BOB PAY

**To:** their sales or partnerships contact
**Subject:** Integrating Bob Pay for small South African merchants

Good day,

I run DigitalFlyer SA. We build web pages and online shops for small South African businesses. Our members are mostly sole operators, often selling items between R80 and R500, and most of them have never taken a card payment online.

We are about to add a second gateway option alongside Paystack, and Bob Pay looks like the better recommendation for our members for one specific reason: as I understand it a sole proprietor can apply as an individual with an ID, proof of address and proof of a bank account, with no CIPC registration needed. That single fact rules a lot of our members in who are otherwise ruled out. I would like to confirm I have it right before we put it in front of anybody.

What I would value from you.

**Confirmation of the above**, plus current turnaround on applications and current per-transaction pricing.

**Onboarding.** What is the cleanest way for us to send members to you? Is there a partner or referral route we should be on?

**Integration.** We plan to implement create-payment, redirect, webhook confirmation and refund, and to verify payment status against your API on webhook receipt rather than trusting the payload. Is that the pattern you would recommend, and is there anything in your flow we should know about before we build?

**Connecting an account.** Our members will be connecting their own Bob Pay accounts through our dashboard, with their customers' money settling directly to them. We are software only and never sit in the middle. Is there an authorisation flow you would prefer for that, rather than a member pasting keys?

**One limitation I am aware of:** as far as I know Bob Pay does not yet support recurring billing. Our own membership billing therefore stays on Paystack and Bob Pay would be for member product sales only. If that has changed, I would like to know.

We have full API integration capability in-house and would rather build it the way you would want it built.

Kind regards,
Dewald Rosema
DigitalFlyer SA

---

## NOTES FOR YOU

**Why these are short.** Each asks four things and gives them a reason to answer. A first approach that opens with our whole story gets skimmed.

**The line that does the work** is the same in all three: *their merchant's money settles directly to that merchant and never passes through us.* Every gateway's first worry about a platform integration is aggregation, because it is a licensing and risk problem for them. Saying it in the first paragraph moves you from "possible problem" to "sensible integrator".

**Bob Go's crown icon** is the one genuinely blocking question. Do not let that email go without an answer to it, because if API access needs a paid plan for members, our courier story changes for every member we onboard and we should know before we advertise it.

**Worth having ready if they ask:** member numbers, monthly order volume, and expected merchant applications per month. Real numbers, even small ones, get a partner conversation further than a projection does.

**Expected outcomes.** Paystack and Bob Go likely point you at existing partner programmes. Bob Pay is the newest of the three and most likely to want an actual call, which is also where you have most leverage to ask for something unusual.
