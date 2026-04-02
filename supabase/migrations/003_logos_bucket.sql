-- Create the public logos storage bucket for agency/client logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152, -- 2 MiB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload/update/delete logos
create policy "Authenticated users can manage logos"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');

-- Allow public read access to logos
create policy "Public read access for logos"
  on storage.objects for select
  to anon
  using (bucket_id = 'logos');
