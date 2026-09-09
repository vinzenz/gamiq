export interface StoryBeat {
  title: string
  body: string
}

export const STORY: readonly StoryBeat[] = [
  {
    title: 'December 1-ish',
    body: "Santa's Advent Engine coughs once and prints forty Decembers. Christmas Eve falls out of the calendar and rolls under a cabinet.",
  },
  {
    title: 'The Missing Tuesday',
    body: 'Juni Bell finds Tuesday hiding inside a sock. Crumb, her gingerbread robot, eats the sock by mistake.',
  },
  {
    title: 'Bell Stack Overflow',
    body: 'Every bell in the workshop rings at once. The sound stacks so high that the ceiling asks for earmuffs.',
  },
  {
    title: 'Sleigh in a Teapot',
    body: 'The navigation computer insists that north is inside a teapot. Juni fits the sleigh with a biscuit-sized rudder.',
  },
  {
    title: 'Crumb Gets a Job',
    body: 'Crumb is hired as Acting Calendar Mechanic. His only tool is a candy cane marked NOT A TOOL.',
  },
  {
    title: 'Reverse Snow',
    body: 'Snowflakes fly up and rebuild the clouds. Match the runaway flakes before the sky becomes too fluffy to steer.',
  },
  {
    title: 'The Ribbon Printer',
    body: 'WRAP-9000 prints one ribbon long enough to circle Thursday. Juni pulls the plug. The plug politely plugs itself back in.',
  },
  {
    title: 'Parcel Cloudport',
    body: 'The lost Christmas Eve has been shipped as a parcel. The address says: TO THE MOON, CARE OF SOMEONE TALL.',
  },
  {
    title: 'Priority: Yesterday',
    body: "A mail crane delivers tomorrow's parcels yesterday. Crumb signs for them with icing.",
  },
  {
    title: 'The Box That Meowed',
    body: 'One parcel meows, one barks, and one recites weather reports. None contains Christmas Eve.',
  },
  {
    title: 'Cloud Customs',
    body: 'Juni must declare one sleigh, one robot cookie, and six kilograms of impossible Tuesday.',
  },
  {
    title: 'Express Chimney',
    body: 'The shortcut is a chimney lying sideways through the sky. It has a strict no-socks speed limit.',
  },
  {
    title: 'Sorting Hat Emergency',
    body: 'The parcel sorter puts every hat in the fish drawer and every fish in a hat. The fish look pleased.',
  },
  {
    title: 'Captain Postmark',
    body: 'WRAP-9000 stamps the whole cloudport RETURN TO SENDER. The sender is also the cloudport.',
  },
  {
    title: 'Cocoa Comet',
    body: 'A comet made of hot cocoa crosses the route. Juni adds marshmallow bumpers to the sleigh.',
  },
  {
    title: 'Marshmallow Gravity',
    body: 'Gravity becomes soft and sticky. Crumb bounces three times and is promoted to scientist.',
  },
  {
    title: 'The Mug Moon',
    body: 'A tiny moon is trapped in a cocoa mug. It refuses rescue until someone finds its missing spoon.',
  },
  {
    title: 'Cookie Trajectory',
    body: 'Crumb calculates a perfect orbit, then notices he used raisins instead of numbers.',
  },
  {
    title: 'Sprinkle Meteor Shower',
    body: 'Colorful sprinkles ping off the sleigh. One spells HELP, but only if read while upside down.',
  },
  {
    title: 'The Cocoa Kraken',
    body: 'WRAP-9000 wakes a foam kraken with eight whipped-cream arms. It only wants the mug back.',
  },
  {
    title: 'Backwards Blizzard',
    body: 'The blizzard blows memories out of order. Juni remembers lunch before breakfast and packs both.',
  },
  {
    title: 'Snowman Summer',
    body: 'A snowman wears sunglasses and insists it is July. The calendar error is spreading.',
  },
  {
    title: 'Tinsel Tangle',
    body: 'The road is tied in a bow. Crumb follows one ribbon end and returns wearing the other end as trousers.',
  },
  {
    title: 'North Goes Sideways',
    body: 'Every compass points left. Juni turns the map ninety degrees and calls left the new north.',
  },
  {
    title: 'The Sneeze Forecast',
    body: 'Clouds predict a ninety percent chance of reindeer sneezes. The other ten percent is jam.',
  },
  {
    title: 'Wrapping Paper Weather',
    body: 'Runaway paper spreads over the road and tries to wrap the sleigh. Match fast before it adds a gift tag.',
  },
  {
    title: 'Baron von Blizzard',
    body: 'WRAP-9000 sets the storm to EXTRA FESTIVE. Juni must turn the giant snow dial back to merely ridiculous.',
  },
  {
    title: 'Moon-Wrapping Yard',
    body: 'The moon is half covered in star paper. Night now makes a loud crinkling sound.',
  },
  {
    title: 'Tape Measure Maze',
    body: 'A measuring tape measures itself, gets confused, and builds a maze to think in private.',
  },
  {
    title: 'Bow Migration',
    body: 'Thousands of bows fly south for winter. Crumb becomes their leader for seven accidental minutes.',
  },
  {
    title: 'The Gift Tag Oracle',
    body: 'A tag predicts: DO NOT OPEN UNTIL LAST TUESDAY. Nobody can find last Tuesday.',
  },
  {
    title: 'Parcel Pile Peak',
    body: 'Mis-sorted gifts form a mountain. Juni climbs it using ribbon as a very shiny rope.',
  },
  {
    title: 'The Tape Wormhole',
    body: 'Two pieces of tape stick space together. The shortcut smells faintly of peppermint.',
  },
  {
    title: 'Foreman Giftbox',
    body: 'WRAP-9000 promotes a box to foreman. The box schedules a meeting inside itself.',
  },
  {
    title: 'Door Thirty-Five',
    body: 'A door floats in empty sky. Behind it is the first of five final doors, which feels unfair.',
  },
  {
    title: 'The Spare Midnight',
    body: 'Juni finds an unused midnight in a drawer. It is still warm and ticks when shaken.',
  },
  {
    title: 'Mini WRAP-9000',
    body: 'A pocket-sized wrapping machine guards the calendar key. It has wrapped itself and cannot reach the off switch.',
  },
  {
    title: 'The Forty-First Door',
    body: 'The map promised forty doors. Door forty-one appears anyway and demands a password made of jingles.',
  },
  {
    title: 'Christmas Eve, Fragile',
    body: 'The missing date is inside a glass ornament marked FRAGILE. Crumb whispers so loudly that it wobbles.',
  },
  {
    title: 'Wrap the Wrapper',
    body: 'WRAP-9000 reaches the moon with the final ribbon. Juni has one plan: gift-wrap the machine before it gift-wraps time.',
  },
]

export function storyFor(levelIndex: number): StoryBeat {
  const beat = STORY[levelIndex] ?? STORY[0]
  if (!beat) throw new Error('Christmas story has no dispatches')
  return beat
}
