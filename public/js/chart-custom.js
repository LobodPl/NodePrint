var ctx = document.getElementById('ActiveChart').getContext('2d');
Chart.defaults.elements.arc.borderWidth = 1;
var StatusChart = new Chart(ctx, {
    type: 'doughnut',
    options: {
        aspectRatio: 2,
        plugins: {
            legend: {
                position: "right",
                labels: {
                    color: "white"
                }
            }
        },
    },
    data: {
        labels: [
            'Printing',
            'File Transfer',
            'Idle',
            'Error'
        ],
        datasets: [{
            label: 'My First Dataset',
            data: [0, 0, 0, 0],
            backgroundColor: [
                '#2196F3',
                '#2bbbad',
                '#4caf50',
                '#F44336'
            ],
            hoverOffset: 4
        }]
    }
})