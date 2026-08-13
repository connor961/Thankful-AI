import type { EventType } from "./types"

export type SampleTranscript = {
  id: string
  label: string
  eventType: EventType
  transcript: string
}

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    id: "baby-shower",
    label: "Baby shower",
    eventType: "baby-shower",
    transcript: `HOST: Okay everyone, let's open some gifts! This first one is from Grandma Susan.
KENNEDI: Oh my goodness, look at this. It's a handmade blanket. Connor, feel how soft this is.
CONNOR: That's incredible. Did you knit this yourself, Susan?
GRANDMA SUSAN: I did, took me three months. That's the same pattern I made for your mother.
KENNEDI: This is beautiful. I'm going to cry. Thank you so much.

HOST: Next up, this big box is from John and Emily.
CONNOR: Whoa, this is heavy. It's... a stroller! The UPPAbaby Vista, the exact one on our registry!
KENNEDI: We wanted this so badly! Thank you, thank you, we can't wait to take the baby on walks.
EMILY: We know how much you love hiking, figured you'd put it to good use.

HOST: This little bag is from Sarah.
KENNEDI: Aww, a collection of children's books. Oh my gosh, Goodnight Moon! Connor, this is already one of our favorites.
CONNOR: We literally read this to each other as a joke last week. (laughing)
SARAH: I had a feeling. There's a couple of my childhood favorites in there too.

HOST: And this one, the tag is a little smudged, it looks like it's from either Ashley or Amanda?
KENNEDI: It's a diaper bag, a really nice one. Whoever it was, thank you so much, this is so practical.`,
  },
  {
    id: "wedding",
    label: "Wedding",
    eventType: "wedding",
    transcript: `MC: The happy couple is opening cards and gifts. First one here is from Aunt Carol and Uncle Rob.
BRIDE: A beautiful crystal vase, and a card. Oh, they wrote us the sweetest note and included a gift toward our honeymoon.
GROOM: Carol, Rob, this is so generous. Venice, here we come.

MC: This next gift is from the Martinez family.
BRIDE: It's a Dutch oven, the Le Creuset in that gorgeous blue. We registered for this!
GROOM: We are going to cook so many Sunday dinners in this.

MC: And a card from my college roommate, Priya.
BRIDE: Priya got us a personalized cutting board with our wedding date engraved. And she wrote the funniest note about our first apartment.
GROOM: (laughing) We will never live down that story.`,
  },
  {
    id: "birthday",
    label: "Birthday",
    eventType: "birthday",
    transcript: `MOM: Time for presents! This one's from your friend Marcus.
BIRTHDAY KID: A Lego Star Wars set! The Millennium Falcon! This is the best day ever!
MARCUS: I knew you'd love it.

MOM: This one is from Aunt Jen.
BIRTHDAY KID: A watercolor paint set and a sketchbook. I've been wanting to try painting!
AUNT JEN: You're so creative, I can't wait to see what you make.

MOM: And this card is from Grandpa Joe.
BIRTHDAY KID: Grandpa put in a book about dinosaurs and some money for my savings. Thank you Grandpa!`,
  },
]
