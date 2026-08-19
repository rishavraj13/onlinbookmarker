update public.folders
set is_system = true
where lower(name) = 'clipboard' and is_system = false;
