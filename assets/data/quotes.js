// Curated love lines from books, plays and letters, for the love letters page.
// Only lines from the original texts (not film adaptations). Translations
// noted in `from`. Add your own at the bottom!

export const BOOK_QUOTES = [
  // Jane Austen
  { text: 'In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you.', by: 'Jane Austen', from: 'Pride and Prejudice' },
  { text: 'I cannot fix on the hour, or the spot, or the look, or the words, which laid the foundation. It is too long ago. I was in the middle before I knew that I had begun.', by: 'Jane Austen', from: 'Pride and Prejudice' },
  { text: 'Much as I respect them, I believe I thought only of you.', by: 'Jane Austen', from: 'Pride and Prejudice' },
  { text: 'You pierce my soul. I am half agony, half hope.', by: 'Jane Austen', from: 'Persuasion' },
  { text: 'There could have been no two hearts so open, no tastes so similar, no feelings so in unison.', by: 'Jane Austen', from: 'Persuasion' },
  { text: 'If I loved you less, I might be able to talk about it more.', by: 'Jane Austen', from: 'Emma' },

  // The Brontës
  { text: "He's more myself than I am. Whatever our souls are made of, his and mine are the same.", by: 'Emily Brontë', from: 'Wuthering Heights' },
  { text: 'I have for the first time found what I can truly love. I have found you.', by: 'Charlotte Brontë', from: 'Jane Eyre' },
  { text: 'Every atom of your flesh is as dear to me as my own: in pain and sickness it would still be dear.', by: 'Charlotte Brontë', from: 'Jane Eyre' },
  { text: 'Reader, I married him.', by: 'Charlotte Brontë', from: 'Jane Eyre' },

  // Shakespeare
  { text: 'My bounty is as boundless as the sea, my love as deep; the more I give to thee, the more I have, for both are infinite.', by: 'William Shakespeare', from: 'Romeo and Juliet' },
  { text: 'Good night, good night! Parting is such sweet sorrow, that I shall say good night till it be morrow.', by: 'William Shakespeare', from: 'Romeo and Juliet' },
  { text: 'Doubt thou the stars are fire; doubt that the sun doth move; doubt truth to be a liar; but never doubt I love.', by: 'William Shakespeare', from: 'Hamlet' },
  { text: 'The course of true love never did run smooth.', by: 'William Shakespeare', from: "A Midsummer Night's Dream" },
  { text: 'Journeys end in lovers meeting.', by: 'William Shakespeare', from: 'Twelfth Night' },
  { text: 'Eternity was in our lips and eyes.', by: 'William Shakespeare', from: 'Antony and Cleopatra' },

  // Dickens, Hugo, Fitzgerald, Mitchell
  { text: 'I loved her against reason, against promise, against peace, against hope, against happiness, against all discouragement that could be.', by: 'Charles Dickens', from: 'Great Expectations' },
  { text: 'I wish you to know that you have been the last dream of my soul.', by: 'Charles Dickens', from: 'A Tale of Two Cities' },
  { text: 'The supreme happiness of life is the conviction that we are loved.', by: 'Victor Hugo', from: 'Les Misérables (tr.)' },
  { text: 'To love or to have loved, that is enough. Ask nothing further.', by: 'Victor Hugo', from: 'Les Misérables (tr.)' },
  { text: 'They slipped briskly into an intimacy from which they never recovered.', by: 'F. Scott Fitzgerald', from: 'This Side of Paradise' },
  { text: 'He knew that when he kissed this girl, and forever wed his unutterable visions to her perishable breath, his mind would never romp again like the mind of God.', by: 'F. Scott Fitzgerald', from: 'The Great Gatsby' },
  { text: 'You should be kissed and often, and by someone who knows how.', by: 'Margaret Mitchell', from: 'Gone with the Wind' },

  // The Little Prince, The Princess Bride, John Green
  { text: 'It is only with the heart that one can see rightly; what is essential is invisible to the eye.', by: 'Antoine de Saint-Exupéry', from: 'The Little Prince (tr.)' },
  { text: 'You become responsible, forever, for what you have tamed.', by: 'Antoine de Saint-Exupéry', from: 'The Little Prince (tr.)' },
  { text: '"As you wish" was all he ever said to her.', by: 'William Goldman', from: 'The Princess Bride' },
  { text: 'I fell in love the way you fall asleep: slowly, and then all at once.', by: 'John Green', from: 'The Fault in Our Stars' },

  // Poets & letters
  { text: 'I love you as certain dark things are to be loved, in secret, between the shadow and the soul.', by: 'Pablo Neruda', from: 'Sonnet XVII (tr.)' },
  { text: 'I love you without knowing how, or when, or from where. I love you simply, without problems or pride.', by: 'Pablo Neruda', from: 'Sonnet XVII (tr.)' },
  { text: 'So close that your hand on my chest is my hand, so close that your eyes close as I fall asleep.', by: 'Pablo Neruda', from: 'Sonnet XVII (tr.)' },
  { text: 'i carry your heart with me (i carry it in my heart)', by: 'E. E. Cummings', from: 'i carry your heart with me' },
  { text: 'Grow old along with me! The best is yet to be.', by: 'Robert Browning', from: 'Rabbi Ben Ezra' },
  { text: 'We loved with a love that was more than love.', by: 'Edgar Allan Poe', from: 'Annabel Lee' },
  { text: 'I cannot exist without you. I am forgetful of every thing but seeing you again.', by: 'John Keats', from: 'a letter to Fanny Brawne' },
  { text: 'Absence diminishes small loves and increases great ones, as the wind blows out the candle and fans the bonfire.', by: 'François de La Rochefoucauld', from: 'Maxims (tr.)' },

  { text: 'You pierce my soul. I am half agony, half hope... I have loved none but you.', by: 'Jane Austen', from: 'Persuasion' },

  { text: 'There could have been no two hearts so open, no tastes so similar, no feelings so in unison.', by: 'Jane Austen', from: 'Persuasion' },

  { text: 'The best love is the kind that awakens the soul and makes us reach for more.', by: 'Nicholas Sparks', from: 'The Notebook' },

  { text: 'I love you. And I will love you until I die, and if there is life after that, I’ll love you then.', by: 'Cassandra Clare', from: 'City of Glass' },

  { text: 'I no longer believed in the idea of soul mates... but I was beginning to believe that a very few times in your life, you might meet someone who was exactly right for you.', by: 'Lisa Kleypas', from: 'Blue-Eyed Devil' },

  { text: 'So, I love you because the entire universe conspired to help me find you.', by: 'Paulo Coelho', from: 'The Alchemist' },

  { text: 'You can love someone so much... But you can never love people as much as you can miss them.', by: 'John Green', from: 'Looking for Alaska' },

  { text: 'You’re my moon, my stars, you’re my sunrises and sunsets. You’re just everything.', by: 'Will Darbyshire', from: 'This Modern Love' },

  { text: 'You look like music… And I can’t write anything that would do you justice.', by: 'Will Darbyshire', from: 'This Modern Love' },

  { text: 'You’re a collage of all my happy moments and a sense of comfort during the sad ones.', by: 'Will Darbyshire', from: 'This Modern Love' },

  { text: 'My nightmares are usually about losing you. I’m okay once I realize you’re here.', by: 'Suzanne Collins', from: 'Catching Fire' },

  { text: 'He stepped down, trying not to look long at her, as if she were the sun, yet he saw her, like the sun, even without looking.', by: 'Leo Tolstoy', from: 'Anna Karenina' },

  { text: 'I have loved none but you.', by: 'Jane Austen', from: 'Persuasion' },

  { text: 'Love is needing someone. Love is putting up with someone’s bad qualities because they somehow complete you.', by: 'Sarah Dessen', from: 'This Lullaby' },

  { text: 'When someone loves you, the way they talk about you is different. You feel safe and comfortable.', by: 'Jess C. Scott', from: 'The Intern' },

  { text: 'The real lover is the man who can thrill you by kissing your forehead or smiling into your eyes.', by: 'Marilyn Monroe', from: 'Attributed quote' },

  { text: 'Remember that the best relationship is one in which your love for each other exceeds your need for each other.', by: 'Dalai Lama XIV', from: 'Attributed quote' },

  { text: 'But love, first learned in a lady’s heart, was not easily forgotten.', by: 'Jane Austen', from: 'Sense and Sensibility' },

  { text: 'Whatever our souls are made of, his and mine are the same.', by: 'Emily Brontë', from: 'Wuthering Heights' },

  { text: 'If I know what love is, it is because of you.', by: 'Hermann Hesse', from: 'Narcissus and Goldmund' },

  { text: 'Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.', by: 'Maya Angelou', from: 'Attributed quote' },

  { text: 'I wish I knew how to quit you.', by: 'Annie Proulx', from: 'Brokeback Mountain' },

  { text: 'Whatever happens tomorrow, or for the rest of my life, I’m happy now... because I love you.', by: 'Bill Watterson', from: 'Calvin and Hobbes' },

  { text: 'You are my heart, my life, my one and only thought.', by: 'Arthur Conan Doyle', from: 'The White Company' },

  { text: 'We loved with a love that was more than love.', by: 'Edgar Allan Poe', from: 'Annabel Lee' },

  { text: 'Love is a smoke made with the fume of sighs.', by: 'William Shakespeare', from: 'Romeo and Juliet' },

  { text: 'If I had a flower for every time I thought of you... I could walk through my garden forever.', by: 'Alfred Lord Tennyson', from: 'Attributed quote' },

  { text: 'You are the finest, loveliest, tenderest, and most beautiful person I have ever known—and even that is an understatement.', by: 'F. Scott Fitzgerald', from: 'Letter to Zelda Fitzgerald' },

  { text: 'I wish you to know that you have been the last dream of my soul.', by: 'Charles Dickens', from: 'A Tale of Two Cities' },

  { text: 'To love and be loved is to feel the sun from both sides.', by: 'David Viscott', from: 'Attributed quote' },


  // ---- add your own below, e.g.
  // { text: 'something you once said to her', by: 'kubie', from: 'a voice note, 2024' },
  
];
