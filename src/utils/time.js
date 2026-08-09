function parseTimeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const normalizedMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalizedMinutes % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function buildDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00`);
}

function buildDateOnly(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

module.exports = {
  buildDateOnly,
  buildDateTime,
  formatDate,
  minutesToTime,
  parseTimeToMinutes
};
