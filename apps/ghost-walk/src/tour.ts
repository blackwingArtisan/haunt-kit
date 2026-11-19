import { defineTour } from '@haunt-kit/template/core';

/**
 * Des Moines After Dark: six stops from the Des Moines River to Terrace Hill,
 * about 4 km on foot.
 *
 * Honesty rules for this file:
 * - kind "legend": a story already published about this place. Narration says
 *   "legend says" and the source is cited below.
 * - kind "history": documented fact, cited.
 * - kind "fiction": invented for this walk and labeled as fiction in the app.
 *   Fiction is only set in public spaces (river, park, sidewalk), never pinned
 *   to a home or a business.
 * Sources were checked on 2026-11-18.
 */
const ACCESSED = '2026-11-18';

const TIMES_DELPHIC = {
  title: 'The ghosts of Des Moines',
  publisher: 'The Times-Delphic (Drake University student newspaper), Oct. 27, 2021',
  url: 'https://timesdelphic.com/33264/features/33264/',
  accessed: ACCESSED,
};

export const tour = defineTour({
  id: 'des-moines-after-dark',
  title: 'Des Moines After Dark',
  subtitle: 'A self-guided haunted walk from the river to Terrace Hill',
  ordering: 'free',
  credits: 'Stories marked legend retell published local legends; stories marked fiction were invented for this walk.',
  stops: [
    {
      id: 'ferrymans-bell',
      name: "The Ferryman's Bell",
      position: { lat: 41.5852, lng: -93.6168 },
      radius: 45,
      kind: 'fiction',
      clue: 'Start where the city meets the Des Moines River.',
      etiquette: 'Stay on the Riverwalk path, away from the water’s edge after dark.',
      story: [
        'Stand at the rail and listen past the traffic. This story is ours, invented for tonight, so you may believe as much of it as you like.',
        'Before the bridges, a ferryman rang a brass bell to call travelers to the crossing. On the night the first bridge opened, he rang it one last time, and no one came.',
        'They say, in our version, that on foggy nights the bell still rings once, from somewhere out on the water, for anyone who has never been properly welcomed to the city. If you heard it just now: welcome. Walk west.',
      ],
    },
    {
      id: 'one-too-many',
      name: 'One Too Many',
      position: { lat: 41.5853, lng: -93.6353 },
      radius: 50,
      kind: 'fiction',
      clue: 'Find the park where giant figures stand still all night.',
      etiquette: 'Admire the sculptures from the paths; please do not climb them.',
      story: [
        'Another story invented for this walk. The sculptures here are real and celebrated; the visitor in this tale is not.',
        'Night guards in our story keep a simple log: the number of figures standing in the park at closing time. The count is always right at dusk. It is always one too many at midnight.',
        'Count them yourself. If you get the right number, good. If you get one more, do not look for the extra figure. It is already looking for you.',
      ],
    },
    {
      id: 'hoyt-sherman-place',
      name: 'Hoyt Sherman Place',
      position: { lat: 41.58861, lng: -93.63833 },
      radius: 40,
      kind: 'legend',
      clue: 'Climb toward the 1877 mansion with a theater tucked behind it.',
      etiquette: 'View the building from the public sidewalk unless it is open for an event.',
      story: [
        'This house was built in 1877 for Hoyt Sherman, a banker and politician, and his family. The theater behind it still hosts shows today.',
        'Legend says Hoyt Sherman Place is one of the most active paranormal spots in Des Moines. A local psychic told Drake University’s student newspaper in 2021 that it is “very active,” and named it first among the city’s haunted places.',
        'Stand on the walk and look up at the windows. Legend does not say who keeps watch from them. It only says that someone does.',
      ],
      sources: [
        TIMES_DELPHIC,
        { title: 'Hoyt Sherman Place', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Hoyt_Sherman_Place', accessed: ACCESSED },
      ],
    },
    {
      id: 'lamplighters-round',
      name: "The Lamplighter's Round",
      position: { lat: 41.5911, lng: -93.6403 },
      radius: 45,
      kind: 'fiction',
      clue: 'Walk the old streets of Sherman Hill, among the city’s oldest homes.',
      etiquette: 'These are private homes. Keep to the public sidewalk and keep your voice low.',
      story: [
        'A tale invented for this walk, and it belongs to the street, not to any house on it.',
        'In our story, the last lamplighter of the neighborhood never got the news that the lamps had turned electric. He still walks his round, a long pole over one shoulder, checking each light.',
        'If a streetlight flickers as you pass, that is just him, making sure your way is lit. Thank him under your breath, and turn west toward the old cemetery.',
      ],
    },
    {
      id: 'woodland-cemetery',
      name: 'Woodland Cemetery',
      position: { lat: 41.589486, lng: -93.648094 },
      radius: 60,
      kind: 'history',
      clue: 'Find the city’s oldest burial ground, older than Des Moines itself.',
      etiquette: 'This is an active cemetery. Visit only during open hours, stay on the drives and paths, and be respectful.',
      story: [
        'No legend is needed here; the history is strange enough. Woodland Cemetery was established in 1848, before Des Moines became the state capital, and it holds over 80,000 graves.',
        'In 1888 the city added a receiving vault. Through the winter, when the ground froze too hard to dig, the dead waited inside it, unburied, until spring. It was used until about 1910.',
        'At the entrance stands the Hubbell family mausoleum, built with a casket elevator inside that can raise and lower its residents. Remember that elevator. The Hubbells’ old house is the last stop of tonight’s walk.',
      ],
      sources: [
        {
          title: 'Iowa’s Unique Gravestones and Burials',
          publisher: 'Iowa PBS',
          url: 'https://www.iowapbs.org/article/8644/iowas-unique-gravestones-and-burials',
          accessed: ACCESSED,
        },
        {
          title: 'Woodland Cemetery (Des Moines, Iowa)',
          publisher: 'Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Woodland_Cemetery_(Des_Moines,_Iowa)',
          accessed: ACCESSED,
        },
      ],
    },
    {
      id: 'terrace-hill',
      name: 'Terrace Hill',
      position: { lat: 41.58333, lng: -93.64917 },
      radius: 60,
      kind: 'legend',
      finale: true,
      clue: 'The finale: the mansion with the 90-foot tower on Grand Avenue. It wakes only after every other stop.',
      etiquette: 'Terrace Hill is the official residence of the Governor of Iowa. View it from the public sidewalk on Grand Avenue.',
      story: [
        'Terrace Hill was built in the 1860s and later became the Hubbell family home. Today it is the official residence of the Governor of Iowa, its 90-foot tower looking down over the whole city.',
        'Legend says a little girl haunts this house. She is transparent, according to the stories, and she likes to ride the elevator, even though it is only supposed to run with a code.',
        'You have now met two Hubbell elevators tonight: one in the mausoleum, built to lift the dead, and one in this house, which, legend says, a ghost has learned to call. Look up at the tower. If a light moves between floors, someone has pressed the button.',
      ],
      sources: [
        { title: 'Terrace Hill', publisher: 'HauntedPlaces.org', url: 'https://www.hauntedplaces.org/item/terrace-hill/', accessed: ACCESSED },
        TIMES_DELPHIC,
        { title: 'Terrace Hill', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Terrace_Hill', accessed: ACCESSED },
      ],
    },
  ],
  route: [
    { lat: 41.5852, lng: -93.6168 },
    { lat: 41.5853, lng: -93.6215 },
    { lat: 41.5853, lng: -93.6290 },
    { lat: 41.5853, lng: -93.6353 },
    { lat: 41.5866, lng: -93.6383 },
    { lat: 41.58861, lng: -93.63833 },
    { lat: 41.5902, lng: -93.6386 },
    { lat: 41.5911, lng: -93.6403 },
    { lat: 41.5896, lng: -93.6425 },
    { lat: 41.5895, lng: -93.6465 },
    { lat: 41.589486, lng: -93.648094 },
    { lat: 41.5868, lng: -93.6484 },
    { lat: 41.5845, lng: -93.6490 },
    { lat: 41.58333, lng: -93.64917 },
  ],
  mapFeatures: [
    {
      kind: 'river',
      name: 'Des Moines River',
      path: [
        { lat: 41.5935, lng: -93.6138 },
        { lat: 41.5895, lng: -93.6146 },
        { lat: 41.5852, lng: -93.6150 },
        { lat: 41.5812, lng: -93.6152 },
        { lat: 41.5785, lng: -93.6158 },
      ],
    },
    {
      kind: 'river',
      name: 'Raccoon River',
      path: [
        { lat: 41.5785, lng: -93.6158 },
        { lat: 41.5793, lng: -93.6240 },
        { lat: 41.5800, lng: -93.6330 },
        { lat: 41.5796, lng: -93.6420 },
        { lat: 41.5788, lng: -93.6500 },
      ],
    },
    {
      kind: 'park',
      name: '',
      path: [
        { lat: 41.5853, lng: -93.6335 },
        { lat: 41.5853, lng: -93.6370 },
      ],
    },
    {
      kind: 'street',
      name: 'Grand Ave',
      path: [
        { lat: 41.5864, lng: -93.6140 },
        { lat: 41.5864, lng: -93.6300 },
        { lat: 41.5862, lng: -93.6410 },
        { lat: 41.5845, lng: -93.6470 },
        { lat: 41.5838, lng: -93.6530 },
      ],
    },
    {
      kind: 'street',
      name: 'Woodland Ave',
      path: [
        { lat: 41.5893, lng: -93.6365 },
        { lat: 41.5894, lng: -93.6440 },
        { lat: 41.5894, lng: -93.6530 },
      ],
    },
  ],
});
