<?php
// Ten plik odpowiada za wyszukiwanie i przekierowanie do filmu na LuluStream
// Wymagane: ?title=Tytul Filmu (np. Spider-Man) LUB ?id=kod_pliku
// Opcjonalne: ?backup_id=TMDB_ID (do automatycznego fallbacku)

// Włącz raportowanie błędów dla debugowania
error_reporting(E_ALL);
ini_set('display_errors', 1);

$api_key = "2377408fo21vaoc12jp7p";
$id = isset($_GET['id']) ? $_GET['id'] : null;
$title = isset($_GET['title']) ? $_GET['title'] : null;
$backup_id = isset($_GET['backup_id']) ? $_GET['backup_id'] : null;

// Funkcja do fallbacku na VidSrc
function useBackup($tmdb_id)
{
    if ($tmdb_id) {
        $backup_url = "https://vidsrc.me/embed/movie/$tmdb_id?lang=pl";
        header("Location: " . $backup_url);
        exit;
    } else {
        die("Brak LuluStream i brak ID do kopii zapasowej.");
    }
}

// Bezpośrednie przekierowanie po ID
if ($id) {
    header("Location: https://lulustream.com/e/" . $id);
    exit;
}

if ($title) {
    $search_url = "https://lulustream.com/api/file/list?key=" . $api_key . "&title=" . urlencode($title);

    // Próba cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $search_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        // W razie błędu cURL, użyj backupu od razu
        useBackup($backup_id);
    }
    curl_close($ch);

    $data = json_decode($response, true);

    // Sprawdzenie statusu API - jeśli błąd, użyj backup
    if (!isset($data['status']) || $data['status'] !== 200) {
        useBackup($backup_id);
    }

    if (isset($data['result']['files']) && count($data['result']['files']) > 0) {
        $files = $data['result']['files'];
        $best_match = null;
        $highest_score = -1;

        // Szukanie wersji PL (Lektor/Dubbing/PL)
        foreach ($files as $file) {
            $file_title = $file['title'];
            $score = 0;

            if (stripos($file_title, 'pl') !== false)
                $score += 10;
            if (stripos($file_title, 'lektor') !== false)
                $score += 5;
            if (stripos($file_title, 'dubbing') !== false)
                $score += 5;
            if (stripos($file_title, 'napisy') !== false)
                $score += 3;
            // Ignorujemy canplay, bo może być w trakcie enkodowania, a i tak lepiej pokazać "prosessing" niż nic
            // if (isset($file['canplay']) && $file['canplay'] == 1) $score += 2;

            if ($score > $highest_score) {
                $highest_score = $score;
                $best_match = $file['file_code'];
            }
        }

        if (!$best_match) {
            $best_match = $files[0]['file_code'];
        }

        header("Location: https://lulustream.com/e/" . $best_match);
        exit;

    } else {
        // BRAK WYNIKÓW W LULU -> FALLBACK DO VIDSRC
        useBackup($backup_id);
    }

} else {
    echo "Brak parametru ID lub Title!";
}
?>