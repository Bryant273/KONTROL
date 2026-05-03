// Rust Path Guard: Admin Access Control
pub fn is_path_secure(path: &str, has_hardened_token: bool) -> bool {
    if path.contains("/admin") && !has_hardened_token {
        return false;
    }
    true
}
