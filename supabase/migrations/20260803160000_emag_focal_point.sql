-- Kwaai Press image pass, 3 August 2026: where a picture's subject sits,
-- as percentages of its width and height. Only consulted where a picture
-- is cropped to fill a fixed frame (the article hero and the edition
-- cover). Null means 50/50, which is the old centre-crop behaviour, so
-- nothing changes for any existing picture.
alter table emag_assets
  add column if not exists focal_x numeric,
  add column if not exists focal_y numeric;
