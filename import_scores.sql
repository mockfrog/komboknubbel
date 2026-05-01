-- Highscores für Kombo-Knubbel (kombo)
INSERT OR REPLACE INTO leaderboard (id, userId, nickname, score, gameMode, createdAt) VALUES 
('best_kombo_mockfrog', 'legacy_1', 'mockfrog', 5805, 'kombo', CURRENT_TIMESTAMP),
('best_kombo_cockiedieter', 'legacy_2', 'CockieDieter', 4348, 'kombo', CURRENT_TIMESTAMP),
('best_kombo_henrynator', 'legacy_3', 'Henrynator', 3954, 'kombo', CURRENT_TIMESTAMP),
('best_kombo_paulus_maximus', 'legacy_4', 'paulus maximus', 3296, 'kombo', CURRENT_TIMESTAMP);

-- Highscores für Klassisch (classic)
INSERT OR REPLACE INTO leaderboard (id, userId, nickname, score, gameMode, createdAt) VALUES 
('best_classic_mockfrog', 'legacy_1', 'mockfrog', 328, 'classic', CURRENT_TIMESTAMP),
('best_classic_henrynator', 'legacy_3', 'Henrynator', 285, 'classic', CURRENT_TIMESTAMP),
('best_classic_paulus_maximus', 'legacy_4', 'paulus maximus', 203, 'classic', CURRENT_TIMESTAMP),
('best_classic_cockiedieter', 'legacy_2', 'CockieDieter', 185, 'classic', CURRENT_TIMESTAMP);
