CREATE TABLE files(
    path VARCHAR(255) PRIMARY KEY NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(255) NOT NULL,
    preview VARCHAR(255) NOT NULL
);

INSERT INTO files (path, type, preview) VALUES
    ('videbate/image.jpg', 'image', 'videbate/image-preview.jpg'),
    ('videbate/video.mp4', 'video', 'videbate/video-preview.jpg'),
    ('videbate/audio.mp3', 'audio', 'videbate/audio-preview.jpg');
