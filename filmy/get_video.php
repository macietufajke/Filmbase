<?php
// StreamTape API Handler
// Obsługa: ?id=FILE_ID lub ?title=Nazwa Filmu

error_reporting(E_ALL);
ini_set('display_errors', 1);

$api_login = "848b5b4599240563bac7";
$api_key = "Y7r1Xm8pd9Febv";

$file_id = isset($_GET['id']) ? $_GET['id'] : null;
$title = isset($_GET['title']) ? $_GET['title'] : null;

// Funkcja pomocnicza do zapytań API
function streamtape_api($url)
{
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        return json_decode($res, true);
    } else {
        return json_decode(@file_get_contents($url), true);
    }
}

// 1. Jeśli podano ID pliku, pobierz link
if ($file_id) {
    $ticket_url = "https://api.streamtape.com/file/dlticket?file=$file_id&login=$api_login&key=$api_key";
    $ticket_data = streamtape_api($ticket_url);

    if (isset($ticket_data['status']) && $ticket_data['status'] === 200) {
        $ticket = $ticket_data['result']['ticket'];
        // Odczekaj chwilę, czasem wymagane
        // sleep(1); 
        $dl_url = "https://api.streamtape.com/file/dl?file=$file_id&ticket=$ticket";
        $dl_data = streamtape_api($dl_url);

        if (isset($dl_data['status']) && $dl_data['status'] === 200) {
            $final_video_url = $dl_data['result']['url'];
            // Przekieruj do wideo (lub wyświetl w tagu video)
            header("Location: " . $final_video_url);
            exit;
        } else {
            die("Błąd pobierania linku StreamTape: " . ($dl_data['msg'] ?? 'Nieznany'));
        }
    } else {
        die("Błąd tickietu StreamTape: " . ($ticket_data['msg'] ?? 'Nieznany'));
    }
}
// 2. Jeśli podano TYTUŁ, szukaj pliku
elseif ($title) {
    // Listowanie plików z konta i filtrowanie (StreamTape API `file/listfolder` listuje folder)
    // Domyślny folder to zazwyczaj root
    $list_url = "https://api.streamtape.com/file/listfolder?login=$api_login&key=$api_key";
    $list_data = streamtape_api($list_url);

    if (isset($list_data['status']) && $list_data['status'] === 200) {
        $files = $list_data['result']['files'];
        $best_match = null;
        $highest_score = -1;

        foreach ($files as $file) {
            $name = $file['name'];
            $score = 0;

            // Proste dopasowanie nazwy
            if (stripos($name, $title) !== false) {
                $score += 10;
                // Bonus za PL
                if (stripos($name, 'pl') !== false)
                    $score += 5;

                if ($score > $highest_score) {
                    $highest_score = $score;
                    $best_match = $file['linkid']; // StreamTape ID
                }
            }
        }

        if ($best_match) {
            // Znaleziono - zrób przekierowanie do siebie z ID (rekurencja)
            header("Location: get_video.php?id=" . $best_match);
            exit;
        } else {
            echo "<div style='color:white;text-align:center;'>Nie znaleziono filmu '$title' na koncie StreamTape.</div>";
        }
    } else {
        die("Błąd listy plików StreamTape: " . ($list_data['msg'] ?? 'Błąd połączenia'));
    }
} else {
    echo "Brak ID lub Title.";
}
?>